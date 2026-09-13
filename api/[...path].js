// Pika hyrëse serverless për Vercel. Kap të gjitha rrugët /api/*.
const{handleApi}=require('../lib/handler');
module.exports=async(req,res)=>{return handleApi(req,res);};
