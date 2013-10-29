/* global require console process describe it */


var env = process.env;
var cuser = env.COUCHDB_USER ;
var cpass = env.COUCHDB_PASS ;
var chost = env.COUCHDB_HOST || 'localhost';
var cport = env.COUCHDB_PORT || 5984;

// reset env vars so that the default use of environment variables fails
process.env.COUCHDB_HOST=''
process.env.COUCHDB_PORT='1234'
process.env.COUCHDB_USER=''
process.env.COUCHDB_PASS=''


var should = require('should')

var nano = require('nano')

var fs = require('fs')

var test_db ='test/stateful'
var couch = 'http://'+chost+':'+cport

var created_locally=false
var cookie
before(function(done){
    // create a test db, the put data into it

    var docs = {'docs':[{'_id':'doc1'
                        ,foo:'bar'}
                       ,{'_id':'doc2'
                        ,'baz':'bat'}

                       ,{"_id": "801245",
                         "2006": {
                         },
                         "2007": {
                             "vdsimputed": "todo",
                             "wim_neigbors_ready": {
                                 "wim_id": 77,
                                 "distance": 14788,
                                 "direction": "east"
                             },
                             "wim_neigbors": {
                                 "wim_id": 77,
                                 "distance": 14788,
                                 "direction": "east"
                             },
                             "truckimputed": "2013-04-06T04:45:11.832Z finish",
                             "paired_wim": null,
                             "vdsdata": "0",
                             "rawdata": "1",
                             "row": 1,
                             "vdsraw_chain_lengths": [2,2,2,2,2],
                             "vdsraw_max_iterations": 0,
                             "occupancy_averaged": 1,
                             "truckimputation_chain_lengths": [
                                 145,
                                 147,
                                 144,
                                 139,
                                 143
                             ],
                             "truckimputation_max_iterations": 0
                         },
                         "2008": {
                             "vdsimputed": "todo",
                             "wim_neigbors_ready": {
                                 "wim_id": 77,
                                 "distance": 14788,
                                 "direction": "east"
                             },
                             "wim_neigbors": {
                                 "wim_id": 77,
                                 "distance": 14788,
                                 "direction": "east"
                             },
                             "vdsdata": "0",
                             "rawdata": "1",
                             "row": 1,
                             "truckimputed": "2012-05-21 inprocess",
                             "vdsraw_chain_lengths": [2,2,2,2,2],
                             "vdsraw_max_iterations": 0
                         }}

                       ]}
    var nano = require('nano')({"url":couch
                               , "request_defaults" : { "jar" : true }
                               })

    nano.auth(cuser,cpass, function (err, body, headers) {
        if (err) {
            return done(err);
        }

        if (headers && headers['set-cookie']) {
            cookie = headers['set-cookie'];
        }

        nano.db.create(test_db,function(e,b,h){
            if(e && e.status_code && e.status_code == 412){
                // just saying db exists
            }else{
                if(e){
                    return done(e) // other problems
                }else{
                    created_locally=true
                }
            }
            nano.use(test_db).bulk(docs,function(e,b,h){
                should.not.exist(e)
                should.exist(b)
                console.log(b)
                b.should.have.lengthOf(3)
                b[2].should.have.property('rev')
                var rev = b[2].rev
                // attach an image for testing
                var stream = fs.createReadStream('test/muffin.jpg')
                var dest = nano.use(test_db)
                           .attachment
                           .insert('801245'
                                  ,'muffin.jpg'
                                  ,null
                                  ,'image/jpeg'
                                  ,{ 'rev': rev } )
                stream.pipe(dest)

                dest.on('end', function(res){
                    console.log(res)
                    nano.use(test_db)
                    .attachment.get('801245','muffin.jpg',function(e,b,h){
                        should.not.exist(e)
                        return done()
                    })
                    return null
                })
                return null
            })
            return null
        })
        return null
    })
    return null
})

after(function(done){
    if(!created_locally) return done()
    var nano = require('nano')({"url":couch
                               , "request_defaults" : { "jar" : true }
                               })

    nano.auth(cuser,cpass, function (err, body, headers) {
        if (err) {
            return done(err);
        }

        if (headers && headers['set-cookie']) {
            cookie = headers['set-cookie'];
        }

        nano.db.destroy(test_db,function(e,b,h){
            return done(e)
        })
        return null
    })
    return null
})

describe('get vds id states',function(){
    var checker = require('../couch_check_state')


    it('should fail due to bad env vars'
      ,function(done){
           checker({'db':encodeURIComponent(test_db)
                   ,'doc':801245
                   ,'year':2008
                   ,'state':'vdsraw_chain_lengths'}
                  ,function(err,state){
                       should.exist(err)
                       return done()
                   })
       });
    it('should succeed when couchdb and port are set in options'
      ,function(done){
           checker({'db':encodeURIComponent(test_db)
                   ,'doc':801245
                   ,'year':'2007'
                   ,'state':'vdsimputed'
                   ,'couchdb':chost
                   ,'port':cport}
                  ,function(err,state){
                       should.not.exist(err)
                       should.exist(state)
                       state.should.eql("todo")
                       return done()
                   })
       });
    it('should succeed when couchdb and port are set in options'
      ,function(done){
           checker({'db':encodeURIComponent(test_db)
                   ,'doc':801245
                   ,'year':'_attachments'
                   ,'state':'muffin.jpg'
                   ,'couchdb':chost
                   ,'port':cport}
                  ,function(err,state){

                       should.not.exist(err)
                       should.exist(state)
                       state.should.have.property('digest'
                                                 ,'md5-1V1aO4Vl+l8fqzz7gTl3Kw==')
                       return done()
                   })
       });
})
