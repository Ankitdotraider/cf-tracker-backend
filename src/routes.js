const { PrismaClient } = require('@prisma/client')
const jwt = require('jsonwebtoken')
const axios = require('axios')

const prisma = new PrismaClient()

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = decoded.userId
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

const saveHandle = async (req, res) => {
  const { cfHandle } = req.body
  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { cfHandle }
    })
    res.json({ message: 'Handle saved', cfHandle: user.cfHandle })
  } catch {
    res.status(500).json({ error: 'Server error' })
  }
}

const getStats = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user.cfHandle) return res.status(400).json({ error: 'No CF handle saved' })
    const response = await axios.get(`https://codeforces.com/api/user.info?handles=${user.cfHandle}`)
    res.json(response.data)
  } catch {
    res.status(500).json({ error: 'Failed to fetch CF data' })
  }
}

module.exports = { authenticate, saveHandle, getStats }