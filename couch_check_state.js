const superagent = require('superagent')
const config={'couchdb':{}}
const config_okay = require('config_okay')

// wrap call to config_okay, if needed
function config_wrapper(opts,cb,fn){
    if(config.couchdb.host === undefined && opts.config_file !== undefined){
        return config_okay(opts.config_file)
            .then(c => {
                config.couchdb = c.couchdb
                return fn(opts,cb)
            })
    }else{
        return fn(opts,cb)
    }
}


function couchdb_check_state(opts,cb){
    const req = config_wrapper(opts,cb,_couchdb_check_state)
    if(!cb){
        return req
    }
}

function couchdb_check_exists(opts,cb){
    const req = config_wrapper(opts,cb,_couchdb_check_exists)
    if(!cb){
        return req
    }
}


/**
 * make_state_getter
 *
 * I made this into a function generator because I see that one use
 * case is to grab several states with one call.
 *
 * @param {integer} year the year to inspect, or undefined
 * @returns {function} a function that will get the desired state(s)
 */
function make_state_getter(year){
    if(!year || year===undefined){
        return (state,doc) =>{
            return doc[state]
        }
    }else{
        return (state,doc) =>{
            if(doc[year] !== undefined ){
                return doc[year][state]
            }else{
                return doc[year]
            }
        }
    }
}


function get_query(c){
    const db = c.db
    if(db === undefined ){
        throw('db is required in options object under \'db\' key')
    }
    const id = c.doc
    if(id === undefined ){
        throw('document id is required in options object under \'doc\' key')
    }
    const cport = c.port || 5984
    const host = c.host || '127.0.0.1'
    let cdb = host+':'+cport
    if(! /http/.test(cdb)){
        cdb = 'http://'+cdb
    }
    return cdb+'/'+db+'/'+id
}


function cb_or_promise( cb, req ) {
    if(!cb || cb === undefined){
        return req // send back the promise object
    }else{
        // wait here for promise object
        req.then(res =>{
            return cb(null,res)
        }).catch(e =>{
            return cb(e)
        })
        return null
    }
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
    if(opts.couchdb !== undefined){
        throw new Error('hey, you are using an old way of doing this')
    }
    let c = {}
    Object.assign(c,config.couchdb,opts)
    const year = c.year
    const query = get_query(c)
    const state_getter = make_state_getter(year)
    const state = c.state

    const req = superagent
          .get(query)
          .set('accept','application/json')
          .set('followRedirect',true)
          .then( res => {
              const doc = res.body
              // let state be an array
              let result
              let _state = state
              if(! Array.isArray(state)){
                  _state = [state]
              }
              result = _state.map(function(s){
                  return state_getter(s,doc)
              })
              // for backwards compatibility, if array is length 1, make
              // it not array
              if(result.length === 1) result = result[0]
              return result
          })
    return cb_or_promise(cb,req)
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
    const c = {}
    Object.assign(c,config.couchdb,opts)
    const query = get_query(c)
    const req = superagent.head(query)
          .then( res => {
              let result
              if(res.header.etag){
                  result = JSON.parse(res.headers.etag)
              }
              return result
          })

    return cb_or_promise(cb,req)
}

module.exports=couchdb_check_state
module.exports.check_exists=couchdb_check_exists
