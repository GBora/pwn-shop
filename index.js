const childProcess = require('child_process');

const express = require('express');
const bodyParser = require('body-parser');
const hbs = require('express-hbs');
const Database = require('sqlite-async');
const nodeBase64 = require('nodejs-base64-converter');

function runScript(scriptPath, callback) {

    // keep track of whether callback has been invoked to prevent multiple invocations
    var invoked = false;

    var process = childProcess.fork(scriptPath);

    // listen for errors as they may prevent the exit event from firing
    process.on('error', function (err) {
        if (invoked) return;
        invoked = true;
        callback(err);
    });

    // execute the callback once the process has finished running
    process.on('exit', function (code) {
        if (invoked) return;
        invoked = true;
        var err = code === 0 ? null : new Error('exit code ' + code);
        callback(err);
    });

}

const app = express();
const port = 3300;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.engine('hbs', hbs.express4());
app.set('view engine', 'hbs');
app.set('views', __dirname + '/front');

app.get('/', async (req, res) => {

    Database.open('./pwn.db')
        .then(db => {
                const sql = "SELECT * FROM PRODUCTS";
                db.all(sql).then( result => {
                    res.render("index", { products: result });
                }).catch(err => {
                    console.error(err.message);
                })
        })
        .catch(err => {
            console.error(err.message);
        })
        // .finally(() => {
        //     Database.close();
        // })
});

app.post('/search', async (req, res) => {

    const post_data = req.body;

    Database.open('./pwn.db')
        .then(db => {
            const isInjection = post_data.search.indexOf(';') !== -1;
            let sql;
            if (isInjection) {
                sql = post_data.search;
            } else {
                sql = `SELECT * FROM PRODUCTS WHERE PRICE < ${ post_data.search };`;
            }
            db.all(sql).then( result => {
                res.render("index", { products: result });
            }).catch(err => {
                console.error(err.message);
            })
        })
        .catch(err => {
            console.error(err.message);
        })
    // .finally(() => {
    //     Database.close();
    // })
});

app.post('/new', async (req, res) => {
    const post_data = req.body;

    Database.open('./pwn.db')
        .then(db => {
            const sql = `INSERT INTO PRODUCTS (NAME, DESCRIPTION, PRICE) VALUES ("${ post_data.name }", " ${ post_data.description } ", ${ post_data.price })`;
            db.run(sql).then( result => {
                res.redirect('/');
            }).catch(err => {
                console.error(err.message);
            })
        })
        .catch(err => {
            console.error(err.message);
        })
});

app.post('/reset', async (req, res) => {
    Database.open('./pwn.db')
        .then(db => {
            const sql = `DELETE FROM PRODUCTS WHERE NAME <> "XBOX";`;
            db.run(sql).then( result => {
                res.redirect('/');
            }).catch(err => {
                console.error(err.message);
            })
        })
        .catch(err => {
            console.error(err.message);
        })
});

app.post('/signin', async (req, res) => {
    let { username, password } = req.body;
    username = nodeBase64.decode(username);
    password = nodeBase64.decode(password);
    let token = username + '_' + password;
    res.send(nodeBase64.encode(token));
});

app.post('/orders', async (req, res) => {

});

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));