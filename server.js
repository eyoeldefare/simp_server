'use strict';
const express = require('express')
const morgan = require("morgan");

const app = express()
const bodyParser = require('body-parser')
const Stripe = require('stripe');
const enviroment = process.env;
const port = enviroment.PORT || 3000

app.use(bodyParser.json())
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({
    extended: false
}))

const stripe = Stripe(enviroment.STRIPE_SECRET_KEY);

//Client App -------(data)------Server-----(customer)-----Stripe
app.post('/register', async function (req, res, next) {
    const {
        email,
        password
    } = req.body;

    const customer = await stripe.customers.create();

    //create account object and save it somewhere
    const account = {
        account_id: accountId,
        email: email,
        password: password,
        customer_id: customer.id
    } 

    res.send(account);
});

//Client App -------(accountId)------Server-------(key)-------Stripe
app.post('/ephemeral_keys', async function (req, res, next) {
    //1) Verify account using accountId
    //2) Fetch customerId linked to account
    let key = await stripe.ephemeralKeys.create({
        customer: 'cus_HpQzkMvuUqd5oQ'
    }, {
        apiVersion: '2020-03-02'
    });

    res.send(key);
})

app.post('/create_setup_intent', async (req, res) => {
    //Fetch customer associated with current session user
    //eg: account.customer_id
    const intent = await stripe.setupIntents.create({
        customer: 'cus_HpQzkMvuUqd5oQ',
        payment_method_types: ['card'],
    });
    res.send(intent);

});

//Client App -----(payment_method, accountId, itemId)----- Server -------(payment_intent)----- Stripe
//I personally would handle fetching the amount on server side through table association like getting item.id and checking its total value a person has to pay

app.post('/pay', async function (req, res) {
    const {
        amount,
        payment_method,
        currency,
        customer,
        return_url,
        shipping
    } = req.body;

    console.log(
        amount, //amount (verify on your database)
        payment_method, //payment id
        currency, //currency from where payment was made
        customer, //verify customer on your database and should be linked to your user account
        return_url, //return_url, if null, redirected to your app by default
        shipping, //payment shipping info
    );

    //const databasePrice = Math.floor(50.00 * 100);
    try {

        const intent = await stripe.paymentIntents.create({
            amount: amount,
            currency: currency,
            payment_method: payment_method,
            payment_method_types: ['card'],
            customer: customer,
            description: 'A description of transaction',
            receipt_email: 'account@account.com',
            confirm: true,
            return_url: return_url,
            shipping: shipping
        });
        //console.log(intent);
        res.json(intent);
    } catch (error) {

        //Send it to client to show usefull information about why the payment failed
        res.json(error);
    }
})

app.listen(port, function () {
    console.log(`Listening at port ${port}`)
})