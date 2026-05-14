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
 const { handle: cfHandle } = req.body
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

const getContests = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    if (!user.cfHandle) return res.status(400).json({ error: 'No CF handle saved' })

    const handle = user.cfHandle

    const [ratingRes, statusRes] = await Promise.all([
      axios.get(`https://codeforces.com/api/user.rating?handle=${handle}`),
      axios.get(`https://codeforces.com/api/user.status?handle=${handle}`)
    ])

    const contests = ratingRes.data.result
    const submissions = statusRes.data.result

    const contestData = contests.map(contest => {
      const contestSubs = submissions.filter(
        s => s.author.participantType === 'CONTESTANT' &&
             s.contestId === contest.contestId
      )

      const solved = contestSubs
        .filter(s => s.verdict === 'OK')
        .map(s => s.problem.index)

      const attempted = contestSubs
        .filter(s => s.verdict !== 'OK')
        .map(s => s.problem.index)
        .filter(idx => !solved.includes(idx))

      return {
        contestId: contest.contestId,
        contestName: contest.contestName,
        date: new Date(contest.ratingUpdateTimeSeconds * 1000).toISOString(),
        rank: contest.rank,
        ratingBefore: contest.oldRating,
        ratingAfter: contest.newRating,
        delta: contest.newRating - contest.oldRating,
        solved,
        missed: attempted
      }
    })

    res.json({ result: contestData.reverse() })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch contest data' })
  }
}

module.exports = { authenticate, saveHandle, getStats, getContests }
