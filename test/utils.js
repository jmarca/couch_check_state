const superagent = require('superagent')
const request = require('request')
const path    = require('path')
const rootdir = path.normalize(__dirname)
const fs = require('fs')
const testjson = rootdir+'/files/801230.json'
const testattch = rootdir+'/files/801230_2008_001.png'

function promise_wrapper(fn,arg){
    return new Promise((resolve, reject)=>{
        fn(arg,function(e,r){
            if(e){
                console.log(e)
                return reject(e)
            }else{
                return resolve(r)
            }
        })
    })
}



function get_cdb(c){
    const db = c.db
    const cport = c.port || 5984
    const host = c.host || '127.0.0.1'
    let cdb = host+':'+cport
    if(! /http/.test(cdb)){
        cdb = 'http://'+cdb
    }
    return cdb+'/'+db
}


function create_tempdb(config){
    const date = new Date()
    const test_db_unique = [config.couchdb.db,
                          date.getHours(),
                          date.getMinutes(),
                          date.getSeconds(),
                          date.getMilliseconds()].join('-')
    config.couchdb.db = test_db_unique
    //console.log(config)
    const cdb = get_cdb(config.couchdb)
    return superagent.put(cdb)
        .type('json')
        .auth(config.couchdb.auth.username
              ,config.couchdb.auth.password)

}


function teardown(config){
    const cdb = get_cdb(config.couchdb)
    return superagent.del(cdb)
        .type('json')
        .auth(config.couchdb.auth.username
              ,config.couchdb.auth.password)
}



async function populate_db(config){
    console.log('populating test db')
    const cdb = get_cdb(config.couchdb)

    const obj = JSON.parse(await promise_wrapper(fs.readFile,testjson) )
    const id = obj._id
    delete obj._rev
    const res = await superagent.put(cdb+'/'+id)
          .type('json')
          .accept('json')
          .send(obj)

    const doc_revision = res.body.rev

    let url =
        cdb + '/'
        + id + '/801230_2008_001.png'
        + '?rev='+doc_revision


    // console.log('creating request')
    const p = new Promise( (resolve,reject) => {
        const stream = fs.createReadStream(testattch)
        const req = request.put(url,{headers:{'content-type':'image/png'}}
                                , function (error, response, body) {
                                    if(error) return reject(error)
                                    return resolve(body)
                                })

        stream.pipe(req);

    })
    // let blahblah = await attach_req;
    return await p

}


exports.create_tempdb = create_tempdb
exports.teardown = teardown
exports.promise_wrapper = promise_wrapper
exports.populate_db = populate_db
