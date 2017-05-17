var express = require('express');
var router = express.Router();
var request = require('request');



var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise;


var mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL === null && process.env.DATABASE_SERVICE_NAME) {
    var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
        mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
        mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
        mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
        mongoPassword = process.env[mongoServiceName + '_PASSWORD'],
        mongoUser = process.env[mongoServiceName + '_USER'];

    if (mongoHost && mongoPort && mongoDatabase) {
        mongoURLLabel = mongoURL = 'mongodb://';
        if (mongoUser && mongoPassword) {
            mongoURL += mongoUser + ':' + mongoPassword + '@';
        }
        // Provide UI label that excludes user id and pw
        mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
        mongoURL += mongoHost + ':' + mongoPort + '/' + mongoDatabase;

    }

}

var db = mongoose.createConnection(mongoURL);

db.on('error', function(err) {
    console.log(err);
});


var bookSchema = new mongoose.Schema({
    isbn: { type: String },
    state: { type: Number },
    count: { type: Number },
    openid: { type: String },
});

var bookModel = db.model('book', bookSchema);

var userSchema = new mongoose.Schema({
    openid: { type: String },
    name: { type: String },
    image: { type: String },
});


userSchema.statics.findAndModify = function(query, sort, doc, options, callback) {
    return this.collection.findAndModify(query, sort, doc, options, callback);
};

var userModel = db.model('user', userSchema);

var logSchema = new mongoose.Schema({
    isbn: { type: String },
    state: { type: Number },
    openid: { type: String },
});



var logModel = db.model('log', logSchema);


var appid = 'wx3e02c0bcf121e5d7';
var secret = 'eacac692e98d7972e2ad707c80e016c1';
var admins = 'oP_H80KgKZPe1LOpv_LVzq7gAhkU';

function dblog(isbn, state, openid) {

    bookModel.create({
        state: state,
        isbn: isbn,
        openid: openid,
    }, function(err, log) {
        //console.log(log);
        if (err) {
            console.log('log err');
        }
    });

}

function addBook(isbn, openid, callback) {

    var b = new bookModel({ state: 0, isbn: isbn, openid: null, count: 0 });
    b.save(function(err, b) {
        dblog(isbn, 2, openid);
        callback(err === null);
    });
}

function delBook(isbn, openid, callback) {

    bookModel.remove({ isbn: isbn }, function(err) {

        if (err) {
            console.log(err);
        }

        callback(err === null);


    });


}

function borrowBook(isbn, ui, callback) {
    console.log(1);
    addUser(ui.openid, ui.nickName, ui.avatarUrl);
    console.log(2);
    bookModel.update({ isbn: isbn }, { openid: ui.openid, state: 1 }, function(err, count, res) {
        if (err) {
            console.log('borrow err=' + err);
        }
        dblog(isbn, 0, ui.openid);
        console.log('borrow count=' + count)
        console.log(3);
        callback(count.ok == 1);
    });
}

function addUser(openid, name, image) {


    userModel.findOne({ openid: openid }, function(err, user) {
        if (user) {
            console.log('haved user');
        } else {
            userModel.create({ name: name, image: image, openid: openid }, function(err, newuser) {

                if (newuser) {
                    console.log('add user ok');
                } else {
                    console.log('add user err');
                }
            });
        }
    })
}

function returnBook(isbn, openid, callback) {

    bookModel.update({ isbn: isbn }, { openid: null, state: 0, $inc: { count: 1 } }, function(err, count, res) {
        if (err) {
            console.log(err);
        }
        dblog(isbn, 1, openid);
        callback(count.ok == 1);
    });
}

/* GET users listing. */
router.get('/getinfo', function(req, res, next) {
    //arg  isbn openid
    bookModel.findOne({ isbn: req.query.isbn }, function(err, bookob) {
        // console.log(bookob);

        if (bookob) {

            if (bookob.openid) {

                userModel.findOne({ openid: bookob.openid }, function(err, user) {

                    if (user) {

                        bookob._doc['name'] = user.name;
                        bookob._doc['image'] = user.image;
                    }
                    console.log(4);
                    res.send(JSON.stringify(bookob));
                });
            } else {

                res.send(JSON.stringify(bookob));
            }
        } else {
            res.send(JSON.stringify({ state: 3 }));
        }
    });
});
router.get('/getopenid', function(req, res, next) {

    var geturl = 'https://api.weixin.qq.com/sns/jscode2session?appid=' + appid + '&secret=' + secret + '&js_code=' + req.query.code + '&grant_type=authorization_code';
    //console.log(geturl)
    request(geturl, function(err, wxres, body) {
        if (!err && wxres.statusCode == 200) {
            var j = JSON.parse(body);
            j['isadmin'] = j.openid == admins;
            res.send(JSON.stringify(j));
        }
    });
});
router.post('/borrowbook', function(req, res, next) {
    //更新书的状态
    // arg  isbn userinfo


    borrowBook(req.body.isbn, req.body.userInfo, function(r) {
        var info = {
            "err": r ? 0 : 1,
            "isbn": req.query.isbn,
        };
        res.send(JSON.stringify(info));
    });
});
router.post('/returnbook', function(req, res, next) {
    //更新书的状态
    // arg  isbn openid

    returnBook(req.body.isbn, req.body.openid, function(r) {
        var info = {
            "err": r ? 0 : 1,
            "isbn": req.query.isbn,
        };
        res.send(JSON.stringify(info));
    });
});

router.get('/addbook', function(req, res, next) {
    //更新书的状态
    // arg  isbn openid
    //  console.log(req.query);


    addBook(req.query.isbn, req.query.openid, function(r) {
        var info = {
            "err": r ? 0 : 1,
            "isbn": req.query.isbn,
        };
        res.send(JSON.stringify(info));
    });
});

router.get('/delbook', function(req, res, next) {
    //更新书的状态
    // arg  isbn openid
    delBook(req.query.isbn, req.query.openid, function(r) {
        var info = {
            "err": r ? 0 : 1,
            "isbn": req.query.isbn,
        };

        res.send(JSON.stringify(info));
    });
});


module.exports = router;