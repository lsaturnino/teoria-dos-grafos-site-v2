//modulos: express, path, cookie-parser, pug, body-parser, crypto
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const {MongoClient} = require('mongodb');
var app = express();

app.set('views', './views');
app.set('view engine', 'pug'); 

// define um middleware para fornecimento de arquivos estáticos
app.use(express.static('public'));
app.use(express.static('images'));

const uri = "mongodb+srv://root:admin@cluster0.3ycpcoa.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

//Operações Mongo
//Esta função irá criar um novo usuário e adiciona-lo ao banco de dados
async function registrarUsuario(client, newListing) {
    try{
        await client.connect();
        await client.db("sample_grafos").collection("cadastrados").insertOne(newListing);
        console.log('Novo usuário cadastrado.');
      } catch(e){
          console.error(e);
      } finally {
            await client.close();
      }
}

//Essa função ele é responsável por fazer a leitura dos email, possibilitando com que encontremos algum usuário 
//já existente, pois ele não pode se cadastrar mais de uma vez
async function verificarEmailExistente(client, email){
    try{
      await client.connect();
      const user = await client.db("sample_grafos").collection("cadastrados").findOne({
        "email": email
      });
      
      return await user
    } catch(e) {
        console.error(e);
    } finally {
      await client.close();
    }
}
//Essa função faz a leitura do email e da senha do usuário para validar o login
async function verificaLogin(client, email, password){
    try{
      await client.connect();
      const user = await client.db("sample_grafos").collection("cadastrados").findOne({
        "email": email, 
        "password": password
      });
      return await user;
    } catch(e) {
        console.error(e);
    } finally {
      await client.close();
    }  
  }

  async function getUsuario(client){
    try{
        await client.connect()
        const users = await client.db("sample_grafos").collection("cadastrados").find({}).toArray()
        console.log('Lista de usuários')
         users;
    } catch(e) {
        console.error(e);
    } finally {
    await client.close();
    
    }  
}

function logado(req){
    const authToken = req.cookies['AuthToken'];
    return authTokens[authToken] ? true : false
}

const getHashedPassword = (password) => {
    const sha256 = crypto.createHash('sha256');
    const hash = sha256.update(password).digest('base64');
    return hash;
}

const generateAuthToken = () => {
    return crypto.randomBytes(30).toString('hex');
}

//obse
const authTokens = {};

const users = {} // This user is added to the array to avoid creating a new user on each restart

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//ROTASSS
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/leitura', (req, res) => {
    res.render('leitura');
});

app.get('/videos', (req, res) => {
    res.render('videos');
});

app.get('/sobrenos', (req, res) => {
    res.render('sobrenos');
});
app.get('/cadastrarse', (req, res) => {
    res.render('cadastrarse');
});

app.get('/logar', (req, res) => {
    res.render('logar');
});

app.get('/login', (req, res) => {
    if (logado(req)){
       res.redirect('/especialprotected')
    } else {
        res.render('login');
    }  
});


app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = getHashedPassword(password);

    verificaLogin(client, email, hashedPassword).then(user => {
        
        if (user) {          
            const authToken = generateAuthToken();
    
           
            authTokens[authToken] = user;
    
            
            res.cookie('AuthToken', authToken);
    
            
            res.redirect('/especialprotected');
        } else {
            res.render('login', {
                message: 'Parametros inválidos: Nome de usuário e/ou Senha inválidos',
                messageClass: 'alert-danger'
            });
        }
    })
    .catch(console.error) 
});


app.use((req, res, next) => {
  const authToken = req.cookies['AuthToken'];
  req.user = authTokens[authToken];
  next();
});

app.get('/registrar', (req, res) => {
   res.render('registrar');
});
app.post('/registrar', (req, res) => {
    const { email, firstName, lastName, password, confirmPassword } = req.body;
    if(!(firstName === "" || lastName === "" || email === "" || password === "" || confirmPassword === "")){
        if (password === confirmPassword) {     
            verificarEmailExistente(client, email).then(function(user){
                if (user != null) {
                    console.log(`Email já existente:\n ${user}`)
                    res.render('registrar', {
                        message: 'Este usuário já possui um cadastro',
                        messageClass: 'alert-danger'
                    });
                  } else {
                      const hashedPassword = getHashedPassword(password);
                      registrarUsuario(client, {
                        nome: firstName,
                        sobrenome: lastName,
                        email: email,
                        password: hashedPassword          
                      })
                        
                      console.log("Usuário Registrado com sucesso.")
                
                      res.render('login', {
                          message: 'Cadastro feito com sucesso. Prossiga para logar.',
                          messageClass: 'alert-success'
                      });
                  }
            })
            .catch(console.error) 
        } else {
              console.log("Senhas Inválidas")
              res.render('registrar', {
                  message: 'As senhas não se correspodem.',
                  messageClass: 'alert-danger'
              });
        }
    } else {
        console.log("Formulário não está respondido corretamente.")
        res.render('registrar', {
              message: 'Preencha o formulário.',
              messageClass: 'alert-danger'
        });
    }
});

app.get('/especialprotected', (req, res) => {
    if (req.user) {
        res.render('especialprotected', {
          user: req.user
        });
    } else {
        res.render('login', {
            message: 'Por favor faça o login para continuar.',
            messageClass: 'alert-danger'
        });
    }
});
app.use(function(req, res, next) {
    res.render('404', { url: req.url })
});



app.listen(3000, () => {
    console.log("Servidor rodando!");
});