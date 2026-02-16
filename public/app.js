// Simple fetch wrapper
async function request(path, opts = {}){
  opts.headers = opts.headers || {};
  if (!opts.headers['Content-Type'] && opts.method !== 'GET') opts.headers['Content-Type'] = 'application/json';
  if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
  const res = await fetch(path, opts);
  if (res.status === 204) return null;
  const data = await res.json().catch(()=>null);
  if (!res.ok) throw data || { error: 'request failed' };
  return data;
}

// UI elements
const loginSection = document.getElementById('login-section');
const dashboard = document.getElementById('dashboard');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalSave = document.getElementById('modal-save');
const modalCancel = document.getElementById('modal-cancel');

let currentUser = null;
let currentPatient = null;

async function loadMe(){
  try{
    const { user } = await request('/api/me');
    currentUser = user;
    modal.classList.add('hidden');
    loginSection.classList.add('hidden');
    dashboard.classList.remove('hidden');
    document.getElementById('displayName').textContent = user.displayName;
    document.getElementById('role').textContent = user.role;
    document.getElementById('lastLogin').textContent = user.lastLogin || '-';
    if (user.role === 'admin') document.getElementById('nav-users').classList.remove('hidden');
    if (user.role === 'admin') document.getElementById('nav-deleted').classList.remove('hidden');
    showPage('dashboard');
    loadPatients();
  }catch(e){
    loginSection.classList.remove('hidden');
    dashboard.classList.add('hidden');
  }
}

document.getElementById('login-btn').addEventListener('click', async ()=>{
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  try{ await request('/api/login', { method: 'POST', body: { username, password } }); await loadMe(); }
  catch(err){ alert(err.error || 'Login failed'); }
});

document.getElementById('logout').addEventListener('click', async ()=>{ await request('/api/logout', { method: 'POST' }); location.reload(); });

function showPage(id){
  ['dashboard','patients','deleted','logs','users'].forEach(p=>{
    const el = document.getElementById('page-'+p);
    if (el) el.classList.toggle('hidden', p!==id);
  });
}

document.getElementById('nav-dashboard').addEventListener('click', e=>{e.preventDefault(); showPage('dashboard');});
document.getElementById('nav-patients').addEventListener('click', e=>{e.preventDefault(); showPage('patients');});
document.getElementById('nav-deleted').addEventListener('click', e=>{e.preventDefault(); showDeletedPatients();});
document.getElementById('nav-logs').addEventListener('click', e=>{e.preventDefault(); showLogs();});
document.getElementById('nav-users').addEventListener('click', e=>{e.preventDefault(); showUsers();});

document.getElementById('search-btn').addEventListener('click', async ()=>{
  const q = document.getElementById('search-q').value;
  const res = await request('/api/search?q='+encodeURIComponent(q));
  renderPatientsList(res.patients, document.getElementById('search-results'));
});

async function loadPatients(){
  const res = await request('/api/patients');
  renderPatientsList(res.patients, document.getElementById('patients'));
}

async function showDeletedPatients(){
  showPage('deleted');
  try{
    const res = await request('/api/deleted-patients');
    renderPatientsList(res.patients, document.getElementById('deleted-patients'), true);
  }catch(e){
    alert(e.error || 'Failed to load deleted patients');
  }
}

function renderPatientsList(list, container, isDeleted = false){
  container.innerHTML = '';
  for(const p of list){
    const el = document.createElement('div'); el.className='patient'; el.style.borderLeft='4px solid var(--accent)';
    el.innerHTML = `<strong style="color:var(--accent)">${p.name}</strong> <div><small>ID:${p.id} • DOB:${p.dob||'N/A'}</small></div><div>${p.notes||''}</div>`;
    const view = document.createElement('button'); view.textContent='View'; view.style.marginRight='6px';
    view.addEventListener('click', ()=> showPatientDetail(p));
    el.appendChild(view);
    // edit patient only for editors/admin (not if deleted)
    if (!isDeleted && currentUser && (currentUser.role==='editor' || currentUser.role==='admin')){
      const edit = document.createElement('button'); edit.textContent='Edit'; edit.style.marginRight='6px';
      edit.addEventListener('click', ()=> openPatientModal(p)); el.appendChild(edit);
    }
    // delete only admin (or restore if deleted)
    if (currentUser && currentUser.role==='admin'){
      if (isDeleted){
        const restore = document.createElement('button'); restore.textContent='Restore'; restore.style.background='var(--success)';
        restore.addEventListener('click', async ()=>{ try{ await request('/api/patients/'+p.id+'/restore', { method:'POST' }); showDeletedPatients(); }catch(e){ alert(e.error||'Failed to restore patient'); } });
        el.appendChild(restore);
      } else {
        const del = document.createElement('button'); del.textContent='Delete'; del.style.background='var(--danger)';
        del.addEventListener('click', async ()=>{ if (!confirm('Delete patient?')) return; try{ await request('/api/patients/'+p.id, { method:'DELETE' }); loadPatients(); }catch(e){ alert(e.error||'Failed to delete patient'); } });
        el.appendChild(del);
      }
    }
    container.appendChild(el);
  }
}

function showPatientDetail(p){
  currentPatient = p;
  const d = document.getElementById('patient-detail');
  d.innerHTML = `<h4>${p.name}</h4><p><small>ID:${p.id} • DOB:${p.dob||''}</small></p><p>${p.notes||''}</p><div id="patient-docs"></div>`;
  loadDocuments(p.id);
}

async function loadDocuments(patientId){
  try{
    const res = await request('/api/patients/'+patientId+'/documents');
    const container = document.getElementById('patient-docs');
    container.innerHTML = '<h5>Documents</h5>';
    for(const doc of res.documents){
      const el = document.createElement('div'); el.className='card'; el.style.borderLeft='4px solid var(--success)';
      el.innerHTML = `<strong style="color:var(--success)">${doc.title}</strong><div><small>By <span style="font-weight:bold">${doc.creator?doc.creator.displayName:'Unknown'}</span></small></div><div>${doc.content||''}</div>`;
      const edit = document.createElement('button'); edit.textContent='Edit'; edit.style.marginRight='6px';
      edit.addEventListener('click', ()=>{ openDocumentModal(doc, patientId); });
      const del = document.createElement('button'); del.textContent='Delete'; del.style.background='var(--danger)'; del.style.marginRight='6px';
      del.addEventListener('click', async ()=>{ 
        if (!confirm('Delete document?')) return; 
        try{ 
          await request('/api/documents/'+doc.id, { method:'DELETE' }); 
          loadDocuments(patientId); 
        }catch(e){ 
          alert(e.error||'Failed to delete document'); 
        }
      });
      el.appendChild(edit); el.appendChild(del);
      container.appendChild(el);
    }
    // add new document button
    const add = document.createElement('div'); add.className='row'; add.innerHTML = '<button id="add-doc">Add Document</button>';
    container.appendChild(add);
    document.getElementById('add-doc').addEventListener('click', ()=>{ openDocumentModal({}, patientId); });
  }catch(e){
    alert(e.error||'Failed to load documents');
  }
}

document.getElementById('add-patient').addEventListener('click', async ()=>{
  const name = document.getElementById('p-name').value;
  const dob = document.getElementById('p-dob').value;
  try{ await request('/api/patients', { method:'POST', body:{ name, dob } }); document.getElementById('p-name').value=''; document.getElementById('p-dob').value=''; loadPatients(); }
  catch(e){ alert(e.error || 'Add failed'); }
});

// Modal helpers
function openPatientModal(p){
  modalTitle.textContent = p && p.id ? 'Edit Patient' : 'New Patient';
  modalBody.innerHTML = `<div class="row"><input id="m-name" placeholder="Name" value="${p?p.name:''}" /></div><div class="row"><input id="m-dob" placeholder="YYYY-MM-DD" value="${p?p.dob:''}" /></div><div><textarea id="m-notes" placeholder="Notes">${p?p.notes:''}</textarea></div>`;
  modal.classList.remove('hidden');
  modalSave.onclick = async ()=>{
    const body = { name: document.getElementById('m-name').value, dob: document.getElementById('m-dob').value, notes: document.getElementById('m-notes').value };
    try{
      if (p && p.id) await request('/api/patients/'+p.id, { method:'PUT', body }); 
      else await request('/api/patients', { method:'POST', body });
      modal.classList.add('hidden'); 
      loadPatients();
    }catch(e){ 
      alert(e.error||'Failed to save patient'); 
    }
  };
}

function openDocumentModal(doc, patientId){
  patientId = patientId || (doc && doc.patientId) || (currentPatient && currentPatient.id);
  modalTitle.textContent = doc && doc.id ? 'Edit Document' : 'New Document';
  modalBody.innerHTML = `<div class="row"><input id="m-title" placeholder="Title" value="${doc && doc.title?doc.title:''}" /></div><div><textarea id="m-content" placeholder="Content">${doc && doc.content?doc.content:''}</textarea></div>`;
  modal.classList.remove('hidden');
  modalSave.onclick = async ()=>{
    const body = { title: document.getElementById('m-title').value, content: document.getElementById('m-content').value };
    try{
      if (doc && doc.id) await request('/api/documents/'+doc.id, { method:'PUT', body }); 
      else await request('/api/patients/'+patientId+'/documents', { method:'POST', body });
      modal.classList.add('hidden'); 
      loadDocuments(patientId);
    }catch(e){ 
      alert(e.error||'Failed to save document'); 
    }
  };
}

modalCancel.onclick = ()=> { modal.classList.add('hidden'); document.getElementById('modal-body').innerHTML=''; };

function openCreateUserModal(){
  modalTitle.textContent = 'Create User';
  modalBody.innerHTML = `<div class="row"><input id="m-username" placeholder="Username" /></div><div class="row"><input id="m-password" placeholder="Password" type="password" /></div><div class="row"><input id="m-displayName" placeholder="Display Name" /></div><div class="row"><select id="m-role"><option value="normal">Normal User</option><option value="editor">Editor</option><option value="admin">Admin</option></select></div>`;
  modal.classList.remove('hidden');
  modalSave.onclick = async ()=>{
    const body = { username: document.getElementById('m-username').value, password: document.getElementById('m-password').value, displayName: document.getElementById('m-displayName').value, role: document.getElementById('m-role').value };
    try{ await request('/api/users', { method:'POST', body }); modal.classList.add('hidden'); showUsers(); }catch(e){ alert(e.error||'Failed to create user'); }
  };
}

async function showLogs(){
  showPage('logs');
  try{ const res = await request('/api/logs'); const container = document.getElementById('logs'); container.innerHTML = '<table><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr>' + res.logs.map(l=>`<tr style="border-left:3px solid var(--muted)"><td>${new Date(l.createdAt).toLocaleString()}</td><td>${l.User?l.User.displayName:'System'}</td><td><strong style="color:var(--accent)">${l.action}</strong></td><td>${l.details||''}</td></tr>`).join('') + '</table>'; }catch(e){ alert(e.error||'Failed to load logs'); }
}

async function showUsers(){
  showPage('users');
  try{ const res = await request('/api/users'); const container = document.getElementById('users'); container.innerHTML = '<div class="row"><button id="create-user-btn">Create User</button></div><table><tr><th>ID</th><th>Username</th><th>Name</th><th>Role</th><th>LastLogin</th><th>Actions</th></tr>' + res.users.map(u=>`<tr><td>${u.id}</td><td>${u.username}</td><td>${u.displayName}</td><td><span class="role-${u.role}">${u.role}</span></td><td>${u.lastLogin?new Date(u.lastLogin).toLocaleString():''}</td><td>${u.id===currentUser.id?'(self)':'<button data-id="' + u.id + '" class="del-user danger">Delete</button>'}</td></tr>`).join('') + '</table>'; 
    document.getElementById('create-user-btn').addEventListener('click', openCreateUserModal);
    container.querySelectorAll('.del-user').forEach(btn=>btn.addEventListener('click', async ()=>{ if (!confirm('Delete user?')) return; await request('/api/users/'+btn.dataset.id, { method:'DELETE' }); showUsers(); }));
  }catch(e){ alert(e.error||'Failed to load users'); }
}

loadMe();
