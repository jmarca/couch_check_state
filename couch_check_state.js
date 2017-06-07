var superagent = require('superagent')
var _ = require('lodash')
var config={'couchdb':{}}
var config_okay = require('config_okay')

function couchdb_check_state(opts,cb){
    if(config.couchdb.host === undefined && opts.config_file !== undefined){
        return config_okay(opts.config_file)
            .then(function(c){
                config.couchdb = c.couchdb
                return _couchdb_check_state(opts,cb)
            })
    }
    // otherwise, hopefully everything is defined in the opts file!
    return _couchdb_check_state(opts,cb)
}

function couchdb_check_exists(opts,cb){
    if(config.couchdb.host === undefined && opts.config_file !== undefined){
        return config_okay(opts.config_file)
            .then(function(c){
                config.couchdb = c.couchdb
                return _couchdb_check_exists(opts,cb)
            })
    }
    // otherwise, hopefully everything is defined in the opts file!
    return _couchdb_check_exists(opts,cb)
}

/**
 * couchdb_check_state(opts,cb)
 * opts = {'db': the couchdb holding the document,
 *         'doc': the document holding the state,
 *         'year': the year to check (any sub key in the doc, really),
 *         'state': the state to get from the doc under the 'year' key,
 *         'config_file': where to look for options like HOST,PORT
 * }
 * cb = a callback
 *
 * See docs for config_okay to see what to put into config_file
 * make sure config_file is chmod 0600
 *
 * cb will be called as cb(error,value)
 *
 * The error will contain any error passed from accessing couchdb
 *
 * The value can be null if there is nothing in the document, or will
 * equal the value of doc[year][state]
 *
 * in a special case, if there is doc[state], but nothing at doc[year]
 * and/or if opts.year is not defined, then I will return doc[state]
 *
 * So for example, if you want to check 'rawimpute' in the year 2008
 * for detector 1212432, in a couchdb called 'tracking', you would
 * call with
 *
 * {'db':'tracking',doc':'1212432','year':2008,'state':'rawimpute'}
 *
 * If you want to check 'rawimpute' in the year 2008 for detector
 * 1212432, in a couchdb database named vds_detector/tracking/D12, you
 * could call with
 *
 * {'db':'vds_detector%2ftracking%2f/D12','doc':'1212432',
 *  'year':2008,'state':'rawimpute'}
 *
 *
 *
 * note that I don't make any assumptions about the db or year, aside
 * from the fact that I expect that there will be a couchdb document
 * with that name.  Typically this means the detector id should
 * resolve to some string.  If you have a couchdb with slashes, you
 * should remember to escape those properly, etc
 *
 * If you pass dbroot, it is presumed that the separator is a slash,
 * and if you don't want that, then do not use dbroot, use a full
 * couchdb name passed as detector_id
 *
 */
function _couchdb_check_state(opts,cb){
    var c = {}
    _.assign(c,config.couchdb,opts)
    var db = c.db
    var id = c.doc
    var year = c.year
    var state = c.state
    if(opts.couchdb !== undefined){
        throw new Error('hey, you are using an old way of doing this')
    }
    var cdb   = c.host ||  '127.0.0.1'
    var cport = c.port || 5984
    cdb = cdb+':'+cport
    if(! /http/.test(cdb)){
        cdb = 'http://'+cdb
    }

    var query = cdb+'/'+db+'/'+id
    superagent
    .get(query)
    .set('accept','application/json')
    .set('followRedirect',true)
    .end(function(err,res){
        if(err) return cb(err)
        var doc = res.body
        // let state be an array
        var result = []
        var _state = state
        if(! _.isArray(state)){
            _state = [state]
        }
        if(doc[year] === undefined){
            _.each(_state,function(s){
                if(doc[state] === undefined){
                    result.push(null)
                }else{
                    result.push(doc[state])
                }
            })
        }else{
            _.each(_state,function(s){
                if(doc[year][state] === undefined){
                    result.push(null)
                }else{
                    result.push(doc[year][state])
                }
            })
        }
        // if still here, have doc year, but maybe not doc state
        if(result.length === 1) result = result[0]
        return cb(null, result)
    })
}

/**
 * couchdb_check_exists(opts,cb)
 * opts = {'db': the couchdb holding the document,
 *         'doc': the document, does it exist or not,
 *         'config_file': where to look for options like HOST,PORT
 * }
 * cb = a callback
 *
 * See docs for config_okay to see what to put into config_file
 * make sure config_file is chmod 0600
 *
 * cb will be called as cb(error,value)
 *
 * The error will contain any error passed from accessing couchdb
 *
 * The value will be undefined if HEAD does not come back with an etag
 * in the header
 *
 * If HEAD returns an etag, then the result will equal that (the
 * revision number of the document)
 *
 */
function _couchdb_check_exists(opts,cb){
    var c = {}
    _.assign(c,config.couchdb,opts)
    var db = c.db
    var id = c.doc
    var cdb   = c.host ||  '127.0.0.1'
    var cport = c.port || 5984
    cdb = cdb+':'+cport
    if(! /http/.test(cdb)){
        cdb = 'http://'+cdb
    }
    var result
    var uri = cdb+'/'+db+'/'+id
    superagent.head(uri)
    .end(function(err,res){
        if(res.header.etag){
            result = JSON.parse(res.headers.etag)
        }
        return cb(null,result)
    })
}

module.exports=couchdb_check_state
module.exports.check_exists=couchdb_check_exists
