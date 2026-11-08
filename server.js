const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Datos iniciales con usuarios definidos
const defaultData = {
  users: [
    { username: 'mmilla', name: 'Michael Milla', password: '1303_2024' },
    { username: 'mgarcia', name: 'Mirella Garcia', password: '1303_2024' }
  ],
  connection: { status: 'connected', sender: 'Michael Milla', receiver: 'Mirella Garcia' },
  nicknames: { 'Michael Milla': 'Mi Amor', 'Mirella Garcia': 'Mi Vida' },
  wishlist: [
    { id: 1, title: 'Cena Romántica Italiana', category: 'Restaurante', description: 'Pasta fresca y vino tinto en el centro.', image: '🍝', addedBy: 'Michael Milla' },
    { id: 2, title: 'Escapada a la Playa', category: 'Viaje', description: 'Fin de semana viendo el atardecer en la arena.', image: '🌊', addedBy: 'Mirella Garcia' },
    { id: 3, title: 'Café y Postre en el Parque', category: 'Café', description: 'Tarde tranquila caminando y tomando helado.', image: '☕', addedBy: 'Michael Milla' }
  ],
  freeDays: [],
  proposals: [],
  matches: []
};

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
  }
  try {
    const raw = fs.readFileSync(DATA_FILE);
    const data = JSON.parse(raw);
    if (!data.users) data.users = defaultData.users;
    return data;
  } catch (e) {
    return defaultData;
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Endpoint de Login
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    const data = loadData();
    const user = data.users.find(u => u.username === username && u.password === password);
    if (user) {
      return res.json({ success: true, name: user.name, username: user.username });
    } else {
      return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Endpoints generales
app.get('/api/data', (req, res) => {
  res.json(loadData());
});

app.post('/api/wishlist', (req, res) => {
  const data = loadData();
  const newItem = { id: Date.now(), ...req.body };
  data.wishlist.push(newItem);
  saveData(data);
  res.json(newItem);
});

app.delete('/api/wishlist/:id', (req, res) => {
  const { id } = req.params;
  const data = loadData();
  data.wishlist = data.wishlist.filter(item => String(item.id) !== String(id));
  saveData(data);
  res.json({ success: true, wishlist: data.wishlist });
});

app.post('/api/freedays', (req, res) => {
  const data = loadData();
  const newDay = req.body;
  data.freeDays = data.freeDays.filter(d => !(d.user === newDay.user && d.date === newDay.date));
  data.freeDays.push(newDay);
  saveData(data);
  res.json(data.freeDays);
});

app.post('/api/proposals', (req, res) => {
  const data = loadData();
  const proposal = { id: Date.now(), status: 'pending', ...req.body };
  data.proposals.push(proposal);
  saveData(data);
  res.json(proposal);
});

app.post('/api/proposals/:id/respond', (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  const data = loadData();
  
  const proposal = data.proposals.find(p => p.id == id);
  if (!proposal) return res.status(404).json({ error: 'Cartita no encontrada' });

  if (action === 'accept') {
    proposal.status = 'accepted';
    data.matches.push({
      id: Date.now(),
      place: proposal.place,
      date: proposal.date,
      message: proposal.message,
      sender: proposal.sender,
      receiver: proposal.receiver
    });
  } else {
    proposal.status = 'rejected';
  }
  
  saveData(data);
  res.json(proposal);
});

// Endpoint para eliminar un match (cita confirmada)
app.delete('/api/matches/:id', (req, res) => {
  const { id } = req.params;
  const data = loadData();
  data.matches = data.matches.filter(m => String(m.id) !== String(id));
  saveData(data);
  res.json({ success: true, matches: data.matches });
});

// Endpoint para gestionar la conexión de novios
app.post('/api/connection', (req, res) => {
  const { action, sender, receiver } = req.body;
  const data = loadData();
  if (action === 'request') {
    data.connection = { status: 'pending', sender, receiver };
  } else if (action === 'accept') {
    data.connection = { status: 'connected', sender: data.connection.sender || sender, receiver: data.connection.receiver || receiver };
  } else if (action === 'disconnect') {
    data.connection = { status: 'disconnected', sender: null, receiver: null };
  }
  saveData(data);
  res.json(data.connection);
});

// Endpoint para actualizar apodos cariñosos
app.post('/api/nicknames', (req, res) => {
  const { user, nickname } = req.body;
  const data = loadData();
  if (!data.nicknames) data.nicknames = {};
  data.nicknames[user] = nickname;
  saveData(data);
  res.json({ success: true, nicknames: data.nicknames });
});

app.listen(PORT, () => {
  console.log(`Servidor de Nuestros Momentos corriendo en http://localhost:${PORT}`);
});
