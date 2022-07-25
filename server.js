const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
const methodOverride = require('method-override');
app.use(methodOverride('_method'));
const MongoClient = require('mongodb').MongoClient;
app.set('view engine', 'ejs');
app.use('/public',express.static('public'));
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
app.use(session({secret : '비밀 코드', resave: true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());
require('dotenv').config();
let multer = require('multer');
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/img')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  },
  filefilter : function(req, file, cb){

  },
  limits: {
    
  }
});
var upload = multer({ storage: storage });

app.use('/shop', require('./routes/shop.js'));
app.use('/board/sub', require('./routes/board.js'));

var db;
MongoClient.connect(process.env.DB_URL, function(err, client){
  if (err) return console.log(err);
  db = client.db('todoapp');
  app.listen(process.env.PORT, function(){
    console.log('Server is running on port 8080');
  });
});


app.get('/',function(req, res){
  res.render('index');
});

app.get('/write',function(req, res){
  res.render('write');
});



app.get('/list',function(req, res){
  db.collection('post').find().toArray(function(err, result){
    if (err) return console.log(err);
    console.log(result);
    res.render('list.ejs',{posts : result});
  });  
});



app.get('/detail/:id',function(req, res){
  db.collection('post').findOne({_id : parseInt(req.params.id)},function(err, result){
    if (err) return console.log(err);
    console.log(result);
    res.render('detail.ejs',{data : result});
  });
});

app.get('/edit/:id',function(req, res){
  db.collection('post').findOne({_id : parseInt(req.params.id)},function(err, result){
    if (err) return console.log(err);
    console.log(result);
    res.render('edit.ejs',{post : result});
  });
});

app.put('/update',function(req, res){
  console.log(req.body);
  db.collection('post').updateOne({_id : parseInt(req.body.id)},{$set : { 제목 : req.body.title, 날짜 : req.body.date}},function(err, result){
    if (err) return console.log(err);
    console.log('수정됨');
    res.redirect('/list');
  });
});

app.get('/login',function(req, res){
  res.render('login');
});
app.post('/login',passport.authenticate('local',{
  failureRedirect : '/fail'
}) ,function(req, res){
  res.redirect('/');
});

app.get('/mypage',loginConfirm , function(req, res){
  console.log(req.user);
  res.render('mypage', {user : req.user});
});

function loginConfirm(req, res, next){
  if (req.user) next();
  else res.redirect('/login');
}

passport.use(new LocalStrategy({
  usernameField : 'id',   // <input type="text" class="form-control" name="id">
  passwordField : 'pw',   // <input type="text" class="form-control" name="pw">
  session : true,         // session 정보를 저장할지
  passReqToCallback : false
}, function(id, pw, done){
  db.collection('login').findOne({id : id, pw : pw},function(err, result){
    if (err) return done(err);
    if (!result) return done(null, false, {message : '아이디가 존재하지 않습니다.'});
    if (result.pw != pw) return done(null, false, {message : '비밀번호가 틀렸습니다.'});
    else return done(null, result);
  });
}));



passport.serializeUser(function(user, done){
  done(null, user.id);
});
passport.deserializeUser(function(id, done){
  db.collection('login').findOne({id : id},function(err, result){
    if (err) return done(err);
    done(null, result);
  });
});

app.post('/add',function(req, res){
  res.redirect('/list');
  db.collection('counter').findOne({name : '게시물 개수'},function(err, result){
    var totalPost = result.totalPost;
    var dbData = {_id : totalPost+1, 제목 : req.body.title, 날짜 : req.body.date, 작성자 : req.user._id}
    db.collection('post').insertOne(dbData,function(err,result){
      if (err) return console.log(err);
      console.log('저장됨');
      db.collection('counter').updateOne({name : '게시물 개수'},{$inc : {totalPost : 1}},function(err,result){
        if (err) return console.log(err);
        console.log('카운트 업데이트됨');
      });
    });
  });
});

app.delete('/delete',function(req, res){
  console.log(req.body);
  req.body._id = parseInt(req.body._id);
  var deleteData = {_id : req.body._id, 작성자 : req.user._id};
  db.collection('post').deleteOne(deleteData, function(err, result){
    if (err) console.log('오류');
    else{
      console.log('삭제됨');
      res.status(200).send({message : '삭제됨'});
    }
  });
});


app.post('/register',function(req, res){
  db.collection('login').findOne({id : req.body.id}, function(err, result){
    if (err) return console.log(err);
    if (result.id == req.body.id) return res.send('사용할 수 없는 ID');
    else{
      db.collection('login').insertOne({id : req.body.id, pw : req.body.pw},function(err, result){
        if (err) return console.log(err);
        console.log('저장됨');
        res.redirect('/login');
      });
    }
  });
});

app.get('/search',(req, res)=>{
  console.log(req.query);
  
  var searchCond = [
    {
      $search: {
        index: 'titleSearch', // index 이름
        text: {
          query: req.query.value,
          path: '제목'  // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
        }
      }
    },
    { $sort : { _id : -1 } },
    { $limit : 10 }
  ] 
  db.collection('post').aggregate(searchCond).toArray((err, result)=>{
    if (err) return console.log(err);
    console.log(result);
    res.render('list.ejs',{posts : result});
  });
});

app.get('/upload', (req, res)=>{
  res.render('upload');
});

app.post('/upload',upload.array('profile', 10),(req, res)=>{
  res.send('업로드 완료')
});

app.get('/image/:imgName',(req, res)=>{
  res.sendFile(__dirname + '/public/img/' + req.params.imgName);
});