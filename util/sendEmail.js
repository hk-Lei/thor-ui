'use strict';
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport('smtps://1321812120%40qq.com:Node.js1413@smtp.qq.com');

exports.sendEmail = function (errNodes) {
	errNodes = errNodes || [];
	console.log('=================================errNodes.toString()',errNodes.toString());
	errNodes = errNodes.map((item)=>{
		return 	`<li>${item}</li>`;
	}).toString().replace(/,/g, '');
	
	if(errNodes.length){
		transporter.sendMail({
			from : "1321812120@qq.com",
			to : "test854043506@qq.com",
			subject: "thor error 通知",
			html : `<div><p>这是 thor-ui 发出的通知,您有服务器出现故障,请及时查看修复!</p></div><ul>${errNodes}</ul>`
		}, function(error, response){
			if(error){
				console.log('send email fail');
			}else{
				console.log("Message sent: " + response.message);
			}
			transporter.close();
		});
	}
}
