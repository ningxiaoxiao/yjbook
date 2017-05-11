var express = require('express');
var router = express.Router();
var request = require('request');

var Sequelize = require('sequelize');
var sequelize = new Sequelize('yjbook', 'root', '123456', {
    host: 'localhost',
    dialect: 'mysql'
});

var book = sequelize.define('book', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    isbn: Sequelize.STRING,
    state: Sequelize.INTEGER,
    count: Sequelize.INTEGER,
    onweropenid: Sequelize.STRING,
    onwername: Sequelize.STRING,
    onwerimage: Sequelize.STRING,
}, {
    freezeTableName: true,
    timestamps: false
});

var log = sequelize.define('log', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
    },
    isbn: Sequelize.STRING,
    state: Sequelize.INTEGER, //0 借 1还 2增加 3删除 4禁用
    onweropenid: Sequelize.STRING,
    name: Sequelize.STRING,
    timestamp: Sequelize.STRING,
}, {
    freezeTableName: true,
    timestamps: false
});

var appid = 'wx3e02c0bcf121e5d7';
var secret = 'eacac692e98d7972e2ad707c80e016c1';
var admins = 'oP_H80KgKZPe1LOpv_LVzq7gAhkU';

var addBook = function(isbn, openid, callback) {
    book.create({
        state: 0,
        isbn: isbn,
        count: 0,
    }).then(function(r) {
        callback(r !== null)
    });
};

var delBook = function(isbn, openid, callback) {
    book.destroy({
        where: {
            isbn: isbn
        }
    }).then(function(r) {
        callback(r == 1)
    });
};

var borrowBook = function(isbn, ui) {

    book.update({
        onweropenid: ui.openid,
        onwername: ui.nickName,
        onwerimage: ui.avatarUrl,
        state: 1,
    }, {
        where: {
            isbn: isbn
        }
    }).then(function(dbp) {
        if (dbp[0] == 1) {
            return true;
        }
        return false;

    });
};

var returnBook = function(isbn, openid) {
    book.update({
        onweropenid: null,
        onwername: null,
        onwerimage: null,
        state: 0,
    }, {
        where: {
            isbn: isbn
        }
    }).then(function(dbp) {
        if (dbp[0] == 1) {
            return true;
        }
        return true;

    });
};



/* GET users listing. */
router.get('/getinfo', function(req, res, next) {
    //arg  isbn openid

    var info;
    book.findOne({
        where: {
            isbn: req.query.isbn
        }
    }).then(function(b) {
        //数据库
        //state 0 可用 1 被借了 2 禁用掉了 3 没有这本书
        console.log(b);

        if (b) {
            //从数据库中读出
            info = {
                onweropenid: b.get('onweropenid'),
                state: b.get('state'),
                count: b.get('count'),
                onwerimage: b.get('onwerimage'),
                onwername: b.get('onwername'),
            };

        } else {
            info = {
                onwerimage: '',
                onwername: '',
                onweropenid: '',
                state: 3,
                count: 0
            };

        }
        console.log(info);
        console.log('end');
        res.send(JSON.stringify(info));
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
    var info;
    if (borrowBook(req.body.isbn, req.body.userInfo)) {
        info = {
            "err": 0,
            "msg": "成功",
            "isbn": req.body.isbn
        };
    } else {
        info = {
            "err": 1,
            "msg": "失败",
            "isbn": req.body.isbn

        };
    }
    res.send(JSON.stringify(info));
});
router.post('/returnbook', function(req, res, next) {
    //更新书的状态
    // arg  isbn openid
    var info;
    if (returnBook(req.body.isbn, req.body.openid)) {
        info = {
            "err": 0,
            "msg": "成功",
            "isbn": req.body.isbn,
        };
    } else {
        info = {
            "err": 1,
            "msg": "失败",
            "isbn": req.body.isbn,
        };
    }

    res.send(JSON.stringify(info));
});

router.get('/addbook', function(req, res, next) {
    //更新书的状态
    // arg  isbn openid
    addBook(req.query.isbn, req.query.openid, function(r) {
        var info = {
            "err": r ? 0 : 1,
            "isbn": req.query.isbn,
        }
        res.send(JSON.stringify(info));
    })
});

router.get('/delbook', function(req, res, next) {
    //更新书的状态
    // arg  isbn openid
    delBook(req.query.isbn, req.query.openid, function(r) {
        var info = {
            "err": r ? 0 : 1,
            "isbn": req.query.isbn,
        }

        res.send(JSON.stringify(info));
    })
});


module.exports = router;