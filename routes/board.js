var router = require('express').Router();

router.get('/sports',(req, res) =>{
  res.send('sports');
})

router.get('/game',(req, res) =>{
  res.send('game');
})

module.exports = router;