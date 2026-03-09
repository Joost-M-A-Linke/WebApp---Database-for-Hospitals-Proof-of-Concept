require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const { sequelize, User, Patient, Document, Log, Recipe, Ingredient, RecipeIngredient, CookingStep } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  if (req.session.userId) return next();
  res.status(401).json({ error: 'unauthorized' });
}

app.post('/api/setup', async (req, res) => {
  try {
    await sequelize.sync();
    const { username, password, displayName } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    const existing = await User.findOne({ where: { username } });
    if (existing) return res.status(400).json({ error: 'user exists' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash: hash, displayName: displayName || username });
    res.json({ ok: true, userId: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'setup failed' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const user = await User.findOne({ where: { username } });
  if (!user) return res.status(400).json({ error: 'invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ error: 'invalid credentials' });
  req.session.userId = user.id;
  // update lastLogin and record log
  user.lastLogin = new Date();
  await user.save();
  await Log.create({ userId: user.id, action: 'login', details: `User ${user.username} logged in` });
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', requireAuth, async (req, res) => {
  const user = await User.findByPk(req.session.userId, { attributes: ['id', 'username', 'displayName', 'role', 'lastLogin'] });
  res.json({ user });
});

app.put('/api/me', requireAuth, async (req, res) => {
  const { displayName } = req.body;
  const user = await User.findByPk(req.session.userId);
  if (!user) return res.status(404).json({ error: 'not found' });
  user.displayName = displayName || user.displayName;
  await user.save();
  await Log.create({ userId: user.id, action: 'update_profile', details: `Updated displayName` });
  res.json({ ok: true, user: { id: user.id, username: user.username, displayName: user.displayName } });
});

function requireRole(...roles){
  return async (req,res,next)=>{
    if (!req.session.userId) return res.status(401).json({ error: 'unauthorized' });
    const user = await User.findByPk(req.session.userId);
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    if (!roles.includes(user.role)) return res.status(403).json({ error: 'forbidden' });
    req.user = user;
    next();
  };
}

// Patients CRUD - only non-deleted
app.get('/api/patients', requireAuth, async (req, res) => {
  const patients = await Patient.findAll({ where: { deletedAt: null }, order: [['createdAt', 'DESC']] });
  res.json({ patients });
});

// Deleted patients - admin only
app.get('/api/deleted-patients', requireAuth, requireRole('admin'), async (req, res) => {
  const { Op } = require('sequelize');
  const patients = await Patient.findAll({ where: { deletedAt: { [Op.not]: null } }, order: [['deletedAt', 'DESC']] });
  res.json({ patients });
});

// search patients by name, id, dob
app.get('/api/search', requireAuth, async (req, res) => {
  const { q, name, id, dob } = req.query;
  const { Op } = require('sequelize');
  const where = {};
  if (q){
    where[Op.or] = [
      { name: { [Op.like]: `%${q}%` } },
      { id: isNaN(parseInt(q)) ? -1 : parseInt(q) },
      { dob: { [Op.like]: `%${q}%` } }
    ];
  }
  if (name) where.name = { [Op.like]: `%${name}%` };
  if (id) where.id = parseInt(id);
  if (dob) where.dob = dob;
  const patients = await Patient.findAll({ where, limit: 200, order: [['createdAt','DESC']] });
  res.json({ patients });
});

app.post('/api/patients', requireAuth, async (req, res) => {
  const { name, dob, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  // validate dob format (YYYY-MM-DD or empty)
  if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return res.status(400).json({ error: 'dob must be YYYY-MM-DD format' });
  const patient = await Patient.create({ name, dob: dob || null, notes: notes || '', lastSeenBy: req.session.userId, createdBy: req.session.userId });
  await Log.create({ userId: req.session.userId, action: 'create_patient', details: `Created patient ${patient.name} (${patient.id})` });
  res.json({ patient });
});

app.put('/api/patients/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { name, dob, notes } = req.body;
  const patient = await Patient.findByPk(id);
  if (!patient) return res.status(404).json({ error: 'not found' });
  // validate dob format (YYYY-MM-DD or empty)
  if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return res.status(400).json({ error: 'dob must be YYYY-MM-DD format' });
  // only editors or admin can edit patients
  const user = await User.findByPk(req.session.userId);
  if (!['editor','admin'].includes(user.role)) return res.status(403).json({ error: 'forbidden' });
  patient.name = name || patient.name;
  patient.dob = dob || patient.dob;
  patient.notes = notes || patient.notes;
  patient.lastSeenBy = req.session.userId;
  await patient.save();
  await Log.create({ userId: req.session.userId, action: 'update_patient', details: `Updated patient ${patient.id}` });
  res.json({ patient });
});

app.delete('/api/patients/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const patient = await Patient.findByPk(id);
  if (!patient) return res.status(404).json({ error: 'not found' });
  // only admin can delete patients
  const user = await User.findByPk(req.session.userId);
  if (user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  // soft delete
  patient.deletedAt = new Date();
  await patient.save();
  await Log.create({ userId: req.session.userId, action: 'delete_patient', details: `Deleted patient ${patient.id}` });
  res.json({ ok: true });
});

// Restore deleted patient
app.post('/api/patients/:id/restore', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const patient = await Patient.findByPk(id);
  if (!patient) return res.status(404).json({ error: 'not found' });
  patient.deletedAt = null;
  await patient.save();
  await Log.create({ userId: req.session.userId, action: 'restore_patient', details: `Restored patient ${patient.id}` });
  res.json({ ok: true });
});

// Documents endpoints
app.get('/api/patients/:id/documents', requireAuth, async (req, res) => {
  const docs = await Document.findAll({ where: { patientId: req.params.id }, include: [ { model: User, as: 'creator', attributes: ['id','displayName'] } ], order: [['createdAt','DESC']] });
  res.json({ documents: docs });
});

app.post('/api/patients/:id/documents', requireAuth, async (req, res) => {
  const { title, content } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const doc = await Document.create({ title, content: content||'', patientId: req.params.id, createdBy: req.session.userId });
  await Log.create({ userId: req.session.userId, action: 'create_document', details: `Created document ${doc.id} on patient ${req.params.id}` });
  res.json({ document: doc });
});

app.put('/api/documents/:id', requireAuth, async (req, res) => {
  const doc = await Document.findByPk(req.params.id);
  if (!doc) return res.status(404).json({ error: 'not found' });
  const user = await User.findByPk(req.session.userId);
  if (doc.createdBy !== req.session.userId && user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  doc.title = req.body.title || doc.title;
  doc.content = req.body.content || doc.content;
  await doc.save();
  await Log.create({ userId: req.session.userId, action: 'update_document', details: `Updated document ${doc.id}` });
  res.json({ document: doc });
});

app.delete('/api/documents/:id', requireAuth, async (req, res) => {
  const doc = await Document.findByPk(req.params.id);
  if (!doc) return res.status(404).json({ error: 'not found' });
  const user = await User.findByPk(req.session.userId);
  if (user.role !== 'admin' && doc.createdBy !== req.session.userId) return res.status(403).json({ error: 'forbidden' });
  await doc.destroy();
  await Log.create({ userId: req.session.userId, action: 'delete_document', details: `Deleted document ${doc.id}` });
  res.json({ ok: true });
});

// User management (admin)
app.get('/api/users', requireAuth, requireRole('admin'), async (req, res) => {
  const users = await User.findAll({ attributes: ['id','username','displayName','role','lastLogin'] });
  res.json({ users });
});

app.post('/api/users', requireAuth, requireRole('admin'), async (req, res) => {
  const { username, password, displayName, role } = req.body;
  if (!username || !password || !displayName) return res.status(400).json({ error: 'username, password, displayName required' });
  const existing = await User.findOne({ where: { username } });
  if (existing) return res.status(400).json({ error: 'user exists' });
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, passwordHash: hash, displayName, role: role || 'normal' });
  await Log.create({ userId: req.session.userId, action: 'create_user', details: `Created user ${user.username}` });
  res.json({ user });
});

app.delete('/api/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const u = await User.findByPk(req.params.id);
  if (!u) return res.status(404).json({ error: 'not found' });
  if (u.id === req.session.userId) return res.status(403).json({ error: 'cannot delete own account' });
  await u.destroy();
  await Log.create({ userId: req.session.userId, action: 'delete_user', details: `Deleted user ${u.username}` });
  res.json({ ok: true });
});

// Logs (admin)
app.get('/api/logs', requireAuth, requireRole('admin'), async (req, res) => {
  const logs = await Log.findAll({ include: [ { model: User, attributes: ['id','displayName'] } ], order: [['createdAt','DESC']], limit: 500 });
  res.json({ logs });
});

// ==================== RECIPE ENDPOINTS ====================

// Get all recipes with limited info (for list view)
app.get('/api/recipes', requireAuth, async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const recipes = await Recipe.findAll({
      include: [{
        model: RecipeIngredient,
        include: [{ model: Ingredient }]
      }],
      order: [['createdAt', 'DESC']]
    });
    
    // Format for display - include preview of ingredients
    const formatted = recipes.map(r => ({
      id: r.id,
      name: r.name,
      prepTime: r.prepTime,
      ingredientPreview: r.RecipeIngredients.slice(0, 3).map(ri => ri.Ingredient.name).join(', '),
      createdAt: r.createdAt
    }));
    
    res.json({ recipes: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to load recipes' });
  }
});

// Search recipes by name
app.get('/api/recipes/search/:query', requireAuth, async (req, res) => {
  try {
    const { query } = req.params;
    const { Op } = require('sequelize');
    
    const recipes = await Recipe.findAll({
      where: {
        name: { [Op.like]: `%${query}%` }
      },
      include: [{
        model: RecipeIngredient,
        include: [{ model: Ingredient }]
      }],
      order: [['name', 'ASC']],
      limit: 50
    });
    
    // Format for display
    const formatted = recipes.map(r => ({
      id: r.id,
      name: r.name,
      prepTime: r.prepTime,
      ingredientPreview: r.RecipeIngredients.slice(0, 3).map(ri => ri.Ingredient.name).join(', '),
      createdAt: r.createdAt
    }));
    
    res.json({ recipes: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'search failed' });
  }
});

// Get full recipe detail
app.get('/api/recipes/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const recipe = await Recipe.findByPk(id, {
      include: [
        {
          model: RecipeIngredient,
          include: [{ model: Ingredient }]
        },
        {
          model: CookingStep,
          order: [['stepNumber', 'ASC']]
        }
      ]
    });
    
    if (!recipe) return res.status(404).json({ error: 'recipe not found' });
    
    // Format ingredients
    const ingredients = recipe.RecipeIngredients.map(ri => ({
      id: ri.id,
      name: ri.Ingredient.name,
      amount: ri.amount,
      unit: ri.unit
    }));
    
    // Separate preparation and cooking steps
    const prepSteps = recipe.CookingSteps.filter(s => s.stepType === 'preparation');
    const cookingSteps = recipe.CookingSteps.filter(s => s.stepType === 'cooking');
    
    res.json({
      recipe: {
        id: recipe.id,
        name: recipe.name,
        prepTime: recipe.prepTime,
        notes: recipe.notes,
        ingredients,
        prepSteps: prepSteps.map(s => ({ stepNumber: s.stepNumber, description: s.description })),
        cookingSteps: cookingSteps.map(s => ({ stepNumber: s.stepNumber, description: s.description })),
        createdAt: recipe.createdAt
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to load recipe' });
  }
});

// Create new recipe
app.post('/api/recipes', requireAuth, async (req, res) => {
  try {
    const { name, prepTime, notes, ingredients, prepSteps, cookingSteps } = req.body;
    
    if (!name) return res.status(400).json({ error: 'recipe name required' });
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'at least one ingredient required' });
    }
    
    // Create recipe
    const recipe = await Recipe.create({
      name,
      prepTime: prepTime || null,
      notes: notes || '',
      createdBy: req.session.userId
    });
    
    // Add ingredients
    for (const ing of ingredients) {
      let ingredient = await Ingredient.findOne({ where: { name: ing.name } });
      if (!ingredient) {
        ingredient = await Ingredient.create({ name: ing.name });
      }
      await RecipeIngredient.create({
        recipeId: recipe.id,
        ingredientId: ingredient.id,
        amount: ing.amount || null,
        unit: ing.unit || null
      });
    }
    
    // Add preparation steps
    if (Array.isArray(prepSteps)) {
      for (let i = 0; i < prepSteps.length; i++) {
        await CookingStep.create({
          recipeId: recipe.id,
          stepNumber: i + 1,
          stepType: 'preparation',
          description: prepSteps[i]
        });
      }
    }
    
    // Add cooking steps
    if (Array.isArray(cookingSteps)) {
      for (let i = 0; i < cookingSteps.length; i++) {
        await CookingStep.create({
          recipeId: recipe.id,
          stepNumber: i + 1,
          stepType: 'cooking',
          description: cookingSteps[i]
        });
      }
    }
    
    res.json({ ok: true, recipeId: recipe.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to create recipe' });
  }
});

// Update recipe
app.put('/api/recipes/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, prepTime, notes, ingredients, prepSteps, cookingSteps } = req.body;
    
    const recipe = await Recipe.findByPk(id);
    if (!recipe) return res.status(404).json({ error: 'recipe not found' });
    
    // Update basic info
    if (name) recipe.name = name;
    if (prepTime !== undefined) recipe.prepTime = prepTime;
    if (notes !== undefined) recipe.notes = notes;
    await recipe.save();
    
    // Update ingredients if provided
    if (Array.isArray(ingredients)) {
      await RecipeIngredient.destroy({ where: { recipeId: id } });
      
      for (const ing of ingredients) {
        let ingredient = await Ingredient.findOne({ where: { name: ing.name } });
        if (!ingredient) {
          ingredient = await Ingredient.create({ name: ing.name });
        }
        await RecipeIngredient.create({
          recipeId: recipe.id,
          ingredientId: ingredient.id,
          amount: ing.amount || null,
          unit: ing.unit || null
        });
      }
    }
    
    // Update cooking steps if provided
    if (Array.isArray(cookingSteps) || Array.isArray(prepSteps)) {
      await CookingStep.destroy({ where: { recipeId: id } });
      
      if (Array.isArray(prepSteps)) {
        for (let i = 0; i < prepSteps.length; i++) {
          await CookingStep.create({
            recipeId: recipe.id,
            stepNumber: i + 1,
            stepType: 'preparation',
            description: prepSteps[i]
          });
        }
      }
      
      if (Array.isArray(cookingSteps)) {
        for (let i = 0; i < cookingSteps.length; i++) {
          await CookingStep.create({
            recipeId: recipe.id,
            stepNumber: i + 1,
            stepType: 'cooking',
            description: cookingSteps[i]
          });
        }
      }
    }
    
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to update recipe' });
  }
});

// Delete recipe
app.delete('/api/recipes/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await Recipe.findByPk(id);
    if (!recipe) return res.status(404).json({ error: 'recipe not found' });
    
    // Delete related records
    await RecipeIngredient.destroy({ where: { recipeId: id } });
    await CookingStep.destroy({ where: { recipeId: id } });
    await recipe.destroy();
    
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to delete recipe' });
  }
});

// ==================== END RECIPE ENDPOINTS ====================

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    
    // Disable foreign key checks, sync tables, then re-enable
    await sequelize.query('SET FOREIGN_KEY_CHECKS=0');
    await sequelize.sync({ alter: false });
    await sequelize.query('SET FOREIGN_KEY_CHECKS=1');
    
    app.listen(PORT, () => console.log('Server listening on', PORT));
  } catch (err) {
    console.error('Failed to start', err);
    process.exit(1);
  }
})();
