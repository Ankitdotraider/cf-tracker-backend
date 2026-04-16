const express = require('express')
const cors = require('cors')
require('dotenv').config()

const { signup, login } = require('./auth')
const { authenticate, saveHandle, getStats } = require('./routes')

const app = express()
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'CF Tracker API is running' })
})

app.post('/signup', signup)
app.post('/login', login)
app.put('/me/handle', authenticate, saveHandle)
app.get('/me/stats', authenticate, getStats)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))