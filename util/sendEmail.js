'use strict';
const nodemailer = require("nodemailer");
const child_process = require('child_process');
const transporter = nodemailer.createTransport('smtps://1321812120%40qq.com:Node.js1413@smtp.qq.com');

const sendEmail = function (errNodes) {
	errNodes = errNodes || [];
	errNodes = errNodes.map((item)=>{
		return 	`<li>${item}</li>`;
	}).toString().replace(/,/g, '');
	
	if(errNodes.length){
		transporter.sendMail({
			from : "1321812120@qq.com",
			to : "854043506@qq.com",
			subject: "thor error 通知",
			html : `<div><p>这是 thor-ui 发出的通知,您有服务器出现故障,请及时查看修复!</p></div><ul>${errNodes}</ul>`
		}, function(error, response){
			if(error){
				console.log('send email failed');
			}else{
				console.log("Message sent: " + response.message);
			}
			transporter.close();
		});
	}
};
const sendEmailWithShell = function (errNodes) {
	errNodes = errNodes || [];
	if(errNodes.length){
		errNodes = errNodes.join('\n    ');

		child_process.exec(`echo -e "这是 thor-ui 发出的通知,您有服务器出现故障,请及时查看修复！\n    ${errNodes}" | mail -s "thor error" leihuaike@emar.com `, (err, result)=> {
			if(error){
				console.log('send email failed');
			}else{
				console.log("Message sent: " + response.message);
			}
			process.disconnect();
		});
	}
};
exports.sendEmail = sendEmail;
exports.sendEmailWithShell = sendEmailWithShell;
