const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name:"dbtbj5lrg",
  api_key: "899853691398938",
  api_secret: "S8OIwyqO_frClTPt7SYHb3r4XHI"
});



module.exports.cloudinaryUpload=async(filetoUpload)=>{
  try{
    console.log(filetoUpload)
   const data=await cloudinary.uploader.upload(filetoUpload,{
       resource_type:'auto',
       type: 'upload'
   })
   
    return {
      url:data.secure_url
    }
}catch(e){
return e
}
}
