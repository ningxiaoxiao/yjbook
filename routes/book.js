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
    openid: Sequelize.STRING,
}, {
    freezeTableName: true,
});

var user = sequelize.define('user', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    openid: Sequelize.STRING,
    name: Sequelize.STRING,
    image: Sequelize.STRING,
}, {
    freezeTableName: true,
});


var log = sequelize.define('log', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    isbn: Sequelize.STRING, //被操作的书
    state: Sequelize.INTEGER, //0 借 1还 2增加 3删除 4禁用
    openid: Sequelize.STRING, //操作人
}, {
    freezeTableName: true,
});

book.sync();
log.sync();
user.sync();

var appid = 'wx3e02c0bcf121e5d7';
var secret = 'eacac692e98d7972e2ad707c80e016c1';
var admins = 'oP_H80KgKZPe1LOpv_LVzq7gAhkU';

function dblog(isbn, state, openid) {
    log.create({
        state: state,
        isbn: isbn,
        openid: openid,
    });
}

function addBook(isbn, openid, callback) {
    book.create({
        state: 0,
        isbn: isbn,
        count: 0,
    }).then(function(r) {
        callback(r !== null);
        dblog(isbn, 2, openid)
    });

}

function delBook(isbn, openid, callback) {
    book.destroy({
        where: {
            isbn: isbn
        }
    }).then(function(r) {
        callback(r == 1);
        dblog(isbn, 3, openid)
    });

}

function borrowBook(isbn, ui, callback) {
    book.update({
        openid: ui.openid,
        state: 1,
    }, {
        where: {
            isbn: isbn
        }
    }).then(function(dbp) {
        callback(dbp[0] == 1);
        dblog(isbn, 0, ui.openid)

    });
}

function returnBook(isbn, openid, callback) {
    book.update({
        openid: null,
        count: sequelize.literal('`count` +1'),
        state: 0,
    }, {
        where: {
            isbn: isbn
        }
    }).then(function(dbp) {
        callback(dbp[0] == 1);
        dblog(isbn, 1, openid)
    });
}

/* GET users listing. */
router.get('/getinfo', function(req, res, next) {
    //arg  isbn openid

    //默认数据
    var info = {
        onwerimage: null,
        onwername: null,
        onweropenid: null,
        state: 3,
        count: 0
    };
    book.findOne({
        where: {
            isbn: req.query.isbn
        }
    }).then(function(b) {
        //数据库
        //state 0 可用 1 被借了 2 禁用掉了 3 没有这本书
        //console.log(b);
        if (b) {
            //从数据库中读出
            //读用户

            user.findOne({
                where: {
                    openid: b.get('openid'),
                }
            }).then(function(userb) {
                if (userb) {
                    info = {
                        onweropenid: b.get('openid'),
                        state: b.get('state'),
                        count: b.get('count'),
                        onwerimage: userb.get('image'),
                        onwername: userb.get('name'),
                    };
                } else {
                    info = {
                        onweropenid: b.get('openid'),
                        state: b.get('state'),
                        count: b.get('count'),
                        onwerimage: null,
                        onwername: null,
                    };
                }
                res.send(JSON.stringify(info));
            });
        } else {
            res.send(JSON.stringify(info));
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
    //更新用户信息
    user.findOrCreate({
        where: {
            openid: req.body.userInfo.openid,
        },
        defaults: {
            openid: req.body.userInfo.openid,
            name: req.body.userInfo.nickName,
            image: req.body.userInfo.avatarUrl
        }
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