/**
 * Created by mahui on 16/4/8.
 */
'use strict';

const express = require('express');
const router = express.Router();

const thorRouter = require('./thor');

router.get('/', thorRouter.index); 				//首页
router.get('/connectors', thorRouter.connectors); 				//获取所有数据
router.get('/connector', thorRouter.connector); 				//显示单个节点
router.post('/nodes', thorRouter.addNode); 				//首页


module.exports = router;

