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
    },
    isbn: Sequelize.STRING,
    state: Sequelize.INTEGER,
    count: Sequelize.INTEGER,
    onwer: Sequelize.STRING
}, {
    freezeTableName: true,
    timestamps: false
})

var appid = 'wx3e02c0bcf121e5d7';
var secret = 'eacac692e98d7972e2ad707c80e016c1';


/* GET users listing. */
router.get('/getinfo', function (req, res, next) {
    //arg  isbn openid

    var info;
    book.findOne({
        where: {
            isbn: req.query.isbn
        }
    }).then(function (b) {
        //数据库
        //state 0 可用 1 被借了 2 禁用掉了 3 没有这本书
        console.log(b);

        if (b) {
            //从数据库中读出
            info = {
                onwer: b.get('onwer'),
                state: b.get('state'),
                count: b.get('count')
            };

        } else {
            info = {
                onwer: '',
                state: 3,
                count: 0
            };

        }
        console.log(info);
        console.log('end');
        res.send(JSON.stringify(info));
    });
});
router.get('/getopenid', function (req, res, next) {

    var geturl = 'https://api.weixin.qq.com/sns/jscode2session?appid=' + appid + '&secret=' + secret + '&js_code=' + req.query.code + '&grant_type=authorization_code';
    //console.log(geturl)
    request(geturl, function (err, wxres, body) {
        if (!err && wxres.statusCode == 200) {
            var j = JSON.parse(body);
            res.send(j.openid);
        }
    });
});
router.post('/borrowbook', function (req, res, next) {
    //更新书的状态
    // arg  isbn openid

    book.update({
        onwer: req.body.openid,
        state: 1,
    }, {
        where: {
            isbn: req.body.isbn
        }
    }).then(function (dbp) {

        console.log(dbp);
        var info;
        if (dbp[0] == 1) {
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
    })
});

router.post('/returnbook', function (req, res, next) {
    //更新书的状态
    // arg  isbn openid

    book.update({
        onwer: '',
        state: 0,
    }, {
        where: {
            isbn: req.body.isbn
        }
    }).then(function (dbp) {

        console.log(dbp);
        var info;
        if (dbp[0] == 1) {
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
    })
});




module.exports = router;