// ==================== RECIPE APP ====================

// Simple fetch wrapper
async function request(path, opts = {}) {
  opts.headers = opts.headers || {};
  if (!opts.headers['Content-Type'] && opts.method !== 'GET') {
    opts.headers['Content-Type'] = 'application/json';
  }
  if (opts.body && typeof opts.body !== 'string') {
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(path, opts);
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw data || { error: 'request failed' };
  return data;
}

// State
let currentUser = null;
let currentRecipeId = null;
let editingRecipeId = null;

// DOM Elements
const loginSection = document.getElementById('login-section');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('login-form');
const searchContainer = document.getElementById('searchContainer');
const recipesContainer = document.getElementById('recipesContainer');
const detailModal = document.getElementById('detailModal');
const formModal = document.getElementById('formModal');

// ==================== AUTHENTICATION ====================

async function loadMe() {
  try {
    const { user } = await request('/api/me');
    currentUser = user;
    loginSection.classList.add('hidden');
    dashboard.classList.remove('hidden');
    document.getElementById('userInfo').textContent = `Welcome, ${user.displayName}`;
    loadRecipes();
  } catch (e) {
    loginSection.classList.remove('hidden');
    dashboard.classList.add('hidden');
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  try {
    await request('/api/login', { method: 'POST', body: { username, password } });
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    await loadMe();
  } catch (err) {
    alert(err.error || 'Login failed');
  }
}

async function handleLogout() {
  try {
    await request('/api/logout', { method: 'POST' });
    location.reload();
  } catch (err) {
    alert('Logout failed');
  }
}

// ==================== RECIPE LIST ====================

async function loadRecipes() {
  try {
    const res = await request('/api/recipes');
    renderRecipesList(res.recipes);
  } catch (err) {
    console.error(err);
    recipesContainer.innerHTML = '<p style="text-align:center;color:var(--text-muted);">Failed to load recipes</p>';
  }
}

function renderRecipesList(recipes) {
  if (!recipes || recipes.length === 0) {
    recipesContainer.innerHTML = `
      <div class="empty-state">
        <h2>No recipes yet</h2>
        <p>Create your first recipe to get started!</p>
      </div>
    `;
    return;
  }

  recipesContainer.innerHTML = '<div class="recipes-list"></div>';
  const list = recipesContainer.querySelector('.recipes-list');

  recipes.forEach(recipe => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.innerHTML = `
      <div class="recipe-info">
        <div class="recipe-name">${escapeHtml(recipe.name)}</div>
        <div class="recipe-meta">
          ${recipe.prepTime ? `<span>⏱️ ${recipe.prepTime} min</span>` : ''}
          <span>${new Date(recipe.createdAt).toLocaleDateString()}</span>
        </div>
        ${recipe.ingredientPreview ? `<div class="recipe-ingredients">📝 ${escapeHtml(recipe.ingredientPreview)}</div>` : ''}
      </div>
      <div class="recipe-actions">
        <button onclick="viewRecipe(${recipe.id})">View</button>
        <button class="secondary" onclick="editRecipe(${recipe.id})">Edit</button>
      </div>
    `;
    list.appendChild(card);
  });
}

// ==================== RECIPE SEARCH ====================

async function handleSearch() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) {
    loadRecipes();
    return;
  }

  try {
    const res = await request(`/api/recipes/search/${encodeURIComponent(query)}`);
    renderRecipesList(res.recipes);
    
    // Minimize search container
    searchContainer.classList.add('minimized');
    document.querySelector('header').classList.add('minimized');
  } catch (err) {
    alert(err.error || 'Search failed');
  }
}

// Allow Enter key in search input
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    });
  }
});

// ==================== RECIPE DETAIL ====================

async function viewRecipe(recipeId) {
  try {
    const res = await request(`/api/recipes/${recipeId}`);
    const recipe = res.recipe;
    currentRecipeId = recipeId;

    const detailTitle = document.getElementById('detailTitle');
    const detailContent = document.getElementById('detailContent');

    detailTitle.textContent = recipe.name;

    let html = '';

    // Basic Info
    if (recipe.prepTime) {
      html += `
        <div class="recipe-detail-section">
          <h3>Preparation Time</h3>
          <p>${recipe.prepTime} minutes</p>
        </div>
      `;
    }

    // Ingredients
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      html += '<div class="recipe-detail-section"><h3>Ingredients</h3>';
      recipe.ingredients.forEach(ing => {
        const amount = ing.amount && ing.unit ? `${ing.amount} ${ing.unit}` : (ing.amount || ing.unit || '');
        html += `<div class="ingredient-item"><strong>${escapeHtml(ing.name)}</strong><span>${amount}</span></div>`;
      });
      html += '</div>';
    }

    // Preparation Steps
    if (recipe.prepSteps && recipe.prepSteps.length > 0) {
      html += '<div class="recipe-detail-section"><h3>Preparation Steps</h3>';
      recipe.prepSteps.forEach((step, idx) => {
        html += `<div class="step-item"><strong>Step ${idx + 1}:</strong> ${escapeHtml(step.description)}</div>`;
      });
      html += '</div>';
    }

    // Cooking Steps
    if (recipe.cookingSteps && recipe.cookingSteps.length > 0) {
      html += '<div class="recipe-detail-section"><h3>Cooking Steps</h3>';
      recipe.cookingSteps.forEach((step, idx) => {
        html += `<div class="step-item"><strong>Step ${idx + 1}:</strong> ${escapeHtml(step.description)}</div>`;
      });
      html += '</div>';
    }

    // Notes
    if (recipe.notes) {
      html += `
        <div class="recipe-detail-section">
          <h3>Notes</h3>
          <p>${escapeHtml(recipe.notes)}</p>
        </div>
      `;
    }

    detailContent.innerHTML = html;
    detailModal.classList.add('active');
  } catch (err) {
    alert(err.error || 'Failed to load recipe');
  }
}

function closeDetailModal() {
  detailModal.classList.remove('active');
  currentRecipeId = null;
}

async function deleteRecipe() {
  if (!currentRecipeId) return;
  if (!confirm('Are you sure you want to delete this recipe?')) return;

  try {
    await request(`/api/recipes/${currentRecipeId}`, { method: 'DELETE' });
    closeDetailModal();
    loadRecipes();
  } catch (err) {
    alert(err.error || 'Failed to delete recipe');
  }
}

// ==================== ADD/EDIT RECIPE ====================

function openAddRecipeModal() {
  editingRecipeId = null;
  document.getElementById('formTitle').textContent = 'Add New Recipe';
  document.getElementById('recipeName').value = '';
  document.getElementById('prepTime').value = '';
  document.getElementById('notes').value = '';

  clearIngredients();
  addIngredientInput();
  clearPrepSteps();
  clearCookingSteps();
  addCookingStepInput();

  formModal.classList.add('active');
}

async function editRecipe(recipeId) {
  try {
    const res = await request(`/api/recipes/${recipeId}`);
    const recipe = res.recipe;
    editingRecipeId = recipeId;

    document.getElementById('formTitle').textContent = 'Edit Recipe';
    document.getElementById('recipeName').value = recipe.name;
    document.getElementById('prepTime').value = recipe.prepTime || '';
    document.getElementById('notes').value = recipe.notes || '';

    clearIngredients();
    recipe.ingredients.forEach(ing => {
      addIngredientInput(ing.name, ing.amount, ing.unit);
    });

    clearPrepSteps();
    recipe.prepSteps.forEach(step => {
      addPrepStepInput(step.description);
    });

    clearCookingSteps();
    recipe.cookingSteps.forEach(step => {
      addCookingStepInput(step.description);
    });

    formModal.classList.add('active');
  } catch (err) {
    alert(err.error || 'Failed to load recipe');
  }
}

function closeFormModal() {
  formModal.classList.remove('active');
  editingRecipeId = null;
}

async function handleSaveRecipe(event) {
  event.preventDefault();

  const name = document.getElementById('recipeName').value.trim();
  const prepTime = parseInt(document.getElementById('prepTime').value) || null;
  const notes = document.getElementById('notes').value.trim();

  // Gather ingredients
  const ingredients = [];
  document.querySelectorAll('#ingredientsContainer .ingredient-input-group').forEach(group => {
    const name = group.querySelector('input[placeholder*="Name"]').value.trim();
    const amount = group.querySelector('input[placeholder*="Amount"]').value.trim();
    const unit = group.querySelector('input[placeholder*="Unit"]').value.trim();
    if (name) {
      ingredients.push({ name, amount: amount ? parseFloat(amount) : null, unit: unit || null });
    }
  });

  // Gather prep steps
  const prepSteps = [];
  document.querySelectorAll('#prepStepsContainer .step-input-group').forEach(group => {
    const desc = group.querySelector('textarea').value.trim();
    if (desc) prepSteps.push(desc);
  });

  // Gather cooking steps
  const cookingSteps = [];
  document.querySelectorAll('#cookingStepsContainer .step-input-group').forEach(group => {
    const desc = group.querySelector('textarea').value.trim();
    if (desc) cookingSteps.push(desc);
  });

  // Validate
  if (!name) {
    alert('Recipe name is required');
    return;
  }
  if (ingredients.length === 0) {
    alert('At least one ingredient is required');
    return;
  }
  if (cookingSteps.length === 0) {
    alert('At least one cooking step is required');
    return;
  }

  try {
    const body = {
      name,
      prepTime,
      notes,
      ingredients,
      prepSteps,
      cookingSteps
    };

    if (editingRecipeId) {
      await request(`/api/recipes/${editingRecipeId}`, { method: 'PUT', body });
    } else {
      await request('/api/recipes', { method: 'POST', body });
    }

    closeFormModal();
    loadRecipes();
  } catch (err) {
    alert(err.error || 'Failed to save recipe');
  }
}

// ==================== INGREDIENT INPUTS ====================

function clearIngredients() {
  document.getElementById('ingredientsContainer').innerHTML = '';
}

function addIngredientInput(name = '', amount = '', unit = '') {
  const container = document.getElementById('ingredientsContainer');
  const group = document.createElement('div');
  group.className = 'ingredient-input-group';
  group.innerHTML = `
    <input type="text" placeholder="Ingredient Name" value="${escapeHtml(name)}" required>
    <input type="number" step="0.1" placeholder="Amount" value="${amount}">
    <input type="text" placeholder="Unit (g, ml, cup)" value="${escapeHtml(unit)}">
    <button type="button" class="ingredient-remove-btn" onclick="this.parentElement.remove()">Remove</button>
  `;
  container.appendChild(group);
}

// ==================== PREPARATION STEPS ====================

function clearPrepSteps() {
  document.getElementById('prepStepsContainer').innerHTML = '';
}

function addPrepStepInput(description = '') {
  const container = document.getElementById('prepStepsContainer');
  const group = document.createElement('div');
  group.className = 'step-input-group';
  group.innerHTML = `
    <textarea placeholder="Describe this preparation step...">${escapeHtml(description)}</textarea>
    <button type="button" class="step-remove-btn" onclick="this.parentElement.remove()">Remove</button>
  `;
  container.appendChild(group);
}

// ==================== COOKING STEPS ====================

function clearCookingSteps() {
  document.getElementById('cookingStepsContainer').innerHTML = '';
}

function addCookingStepInput(description = '') {
  const container = document.getElementById('cookingStepsContainer');
  const group = document.createElement('div');
  group.className = 'step-input-group';
  group.innerHTML = `
    <textarea placeholder="Describe this cooking step...">${escapeHtml(description)}</textarea>
    <button type="button" class="step-remove-btn" onclick="this.parentElement.remove()">Remove</button>
  `;
  container.appendChild(group);
}

// ==================== UTILITIES ====================

function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ==================== INITIALIZATION ====================

loadMe();
