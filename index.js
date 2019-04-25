const AWS = require('aws-sdk');
const Lambda = new AWS.Lambda({ apiVersion: '2015-03-31' }) ;

//#################### Common Variable for any Lambda ###################
// --------- Function Lambda ---------
const LAMBDA_SELECTMYSQL = "Utility_ReadDBMySqlFunction";
const LAMBDA_UPDATEMYSQL = "Utility_WriteDBMySqlFunction";
const LAMBDA_GENERATE_TOKEN = "ATKUtil_GenerateToken" ;

// --------- Error Code ---------
const ERROR_CODE = "77777" ;
const SUCCESS_CODE = "100" ;

// --------- Log Function ---------
const LOGGER_LEVEL_DEBUG = 1;
const LOGGER_LEVEL_WARN = 2;
const LOGGER_LEVEL_INFO = 3;
const LOGGER_LEVEL_ERROR = 4;
const LOGGER_LEVEL_FATAL = 5;
const LOGGER_LEVEL = LOGGER_LEVEL_DEBUG;  // set logger level here
const logger = {
        debug : function(log) {writeLog(LOGGER_LEVEL_DEBUG, "[DEBUG] "+log)},
        warn  : function(log) {writeLog(LOGGER_LEVEL_WARN, "[WARN]  "+log)},
        info  : function(log) {writeLog(LOGGER_LEVEL_INFO, "[INFO]  "+log)},
        error : function(log) {writeLog(LOGGER_LEVEL_ERROR, "[ERROR] "+log)},
        fatal : function(log) {writeLog(LOGGER_LEVEL_FATAL, "[FATAL]  "+log)}
};

function writeLog(loggerLevel,log) {
    if (loggerLevel>=LOGGER_LEVEL)
        console.log(log);
}

// --------- Invoke Lambda Function ---------
const invokeLambdaPromise = ( lambdaName , invokeType , paramsObject ) => {
    const params = {
      FunctionName : lambdaName ,
      InvocationType : invokeType ,
      Payload : new Buffer( JSON.stringify( paramsObject ) ) 
    } ;
    console.log('>>> Lamdba params :: %s' , JSON.stringify( params ) );
    return new Promise( ( resolve , reject ) => {
        Lambda.invoke( params , ( err , data ) => {
            if( err ) return reject( err ) ;
            let payload = ( data.Payload ) ?JSON.parse(data.Payload):{} ;
            console.log( '>>> Payload :: %s ' , JSON.stringify(payload)  ) ;
            return resolve( payload ) ;
        }) ;
    }) ;
} ;

//#################### END Common Variable for any Lambda ###################

//=======================================================================================================================

//==================== Additional Variable for this Lambda ====================
//Additional Error Code
//Ex. const ERROR_RESERVE_NOT_FOUND = "72005";

//==================== End Additional Variable for this Lambda ====================



exports.handler = async ( event , context , callback ) => {
//#################### Standard Code for any Lambda ###################
    const done = ( code, message , data ) => callback( null, {
        statusCode: 200 ,
        body: JSON.stringify(
            {
                success: ( code && code != '100' ) ? false:true,
                code: code ,
                description: ( code && code != '100' )  ? `ERROR : ${code} ${message}` : message ,
                data:data?data:{}
            }
        ),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
    
    console.log('>>> event : %s ' , JSON.stringify(event));
    
    let eparams = {},
    responseData = {};
    
    if( event.body ){
        eparams = ( typeof event.body == 'string' ) ? JSON.parse( event.body ) : event.body ;
    }
    
//#################### End Standard Code for any Lambda ###################

    try{
        // let eparams = {},
        //     req_customer = {},
        //     data_cust = {},
        //     resp_insert_cust = {},
        //     resp_select_cust = {},
        //     resp_gen_token = {} ,
        //     req_call_tran = {},
        //     jwt_token = '',
        //     response = {};
        
        console.log("PaidDateStart : " + eparams.paidDateStart);
        console.log("PaidDateEnd : " + eparams.paidDateEnd);
        
        let sqlSelectGroupReceipt = " select date_format(paid_date, '%d/%m/%Y') as paid_date,  count(reserve_id) qty_receipt, sum(bill_amt) total_bill_amt"
            sqlSelectGroupReceipt += ", case when (print_count is not null and print_count > 0) then count(reserve_id) else 0 end qty_print"
            sqlSelectGroupReceipt += ", case when (print_count is null or print_count = 0) then count(reserve_id) end qty_no_print"
            sqlSelectGroupReceipt += " from txn_transaction_report"
            
            if(typeof eparams.paidDateStart != 'undefined' && typeof eparams.paidDateEnd != 'undefined'
                && eparams.paidDateStart != '' && eparams.paidDateEnd != '' ){
                sqlSelectGroupReceipt += " where DATE(paid_date) between STR_TO_DATE(?,'%d/%m/%Y') and STR_TO_DATE(?,'%d/%m/%Y')"
            }
            sqlSelectGroupReceipt += " group by date_format(paid_date, '%d/%m/%Y')";
            sqlSelectGroupReceipt += " order by date_format(paid_date, '%d/%m/%Y')";
            
        let valueSelectGroupReceipt = [];
        if(typeof eparams.paidDateStart != 'undefined' && typeof eparams.paidDateEnd != 'undefined'
                && eparams.paidDateStart != '' && eparams.paidDateEnd != '' ){
            valueSelectGroupReceipt[0] = eparams.paidDateStart;
            valueSelectGroupReceipt[1] = eparams.paidDateEnd;
        }
        
            
        //console.log("sqlSelectGroupReceipt : " + sqlSelectGroupReceipt);
        
        let executeSql = {
            "querylist": {
             "query": sqlSelectGroupReceipt
            ,"value": valueSelectGroupReceipt
            }
        };
        
        console.log("executeSql : " + JSON.stringify(executeSql));

        let resultSelectGroupReceipt = await invokeLambdaPromise( LAMBDA_SELECTMYSQL , 'RequestResponse' , executeSql ) ;
        
        //console.log("resultSelectGroupReceipt : " + JSON.stringify(resultSelectGroupReceipt));
        responseData = resultSelectGroupReceipt[0];
        
   
      done( SUCCESS_CODE , 'success' , responseData ) ;
    }catch(err){
      done( ERROR_CODE , err.message , err );
    }
};