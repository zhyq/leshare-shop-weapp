//app.js
import { Http } from "./class/utils/Http.js";
var wxApi = require('./class/utils/wxApi')
var wxRequest = require('./class/utils/wxRequest')
App({
  onLaunch: function () {
    this.checkLogin()
      .then(this.userInit)
      .catch(() => {
        this.userLogin()
          .then(this.getSession)
          .then(this.getUserInfo)
          .then(this.checkUserInfo)
          .then(this.decodeUserInfo);
      });
  },
  
  //检查登录状态
  checkLogin: function () {
    console.info('检查用户登录情况');
    return new Promise((resolve, reject) => {
      let thirdSessionId = wx.getStorageSync("thirdSessionId");
      let user = wx.getStorageSync("userInfo");
      if (thirdSessionId && user) {
        wxApi.checkSession().then(res => {
          resolve(user);
        }, reject);
      }
      else {
        reject();
      }
    });
  },

  userInit: function(user){
    console.info('用户已登录成功', user)
    this.globalData.userInfo = user;
    this.globalData.userId = user.id;
  },

  userLogin: function () {
    console.info('用户尚未登录，获取用户js_code');
    return new Promise((resolve, reject) => {
      wxApi.wxLogin().then(res => {
        if (!res.code) {
          reject("用户登录js_code获取失败");
        }
        else {
          console.info(`js_code=${res.code}`);
          resolve(res.code);
        }
      }, reject);
    });
  },

  getSession: function (jsCode) {
    console.info('获取用户thirdSessionId');
    return new Promise((resolve, reject) => {
      let url = `${this.globalData.baseUrl}/customers/session`;
      let param = { code: jsCode };

      wxRequest.getRequest(url, param).then(res => {
        let thirdSessionId = res.data.data.sessionId;
        if (!thirdSessionId) {
          reject("thirdSessionId获取失败");
        }
        else {
          console.info(`thirdSessionId=${thirdSessionId}`);
          //缓存3rd_sessionId
          wx.setStorageSync('thirdSessionId', thirdSessionId);
          resolve(thirdSessionId);
        }
      }, reject);
    });
  },

  getUserInfo: function (thirdSessionId) {
    console.info('获取用户基本信息');
    return new Promise((resolve, reject) => {
      wxApi.wxGetUserInfo().then(res => {
        res["thirdSessionId"] = thirdSessionId;
        resolve(res);
      }, reject);
    });
  },

  checkUserInfo: function (rawUser) {
    console.info('检查用户信息完整性', rawUser);
    return new Promise((resolve, reject) => {
      let url = `${this.globalData.baseUrl}/customers/checkUserInfo`;
      let param = {
        rawData: rawUser.rawData,
        signature: rawUser.signature,
        sessionId: rawUser.thirdSessionId
      };
      wxRequest.getRequest(url, param).then(res => {
        if (!res.data.data.checkPass) {
          reject("数据完整性验证失败");
        }
        else {
          resolve(rawUser);
        }
      }, reject);

    });
  },

  decodeUserInfo: function (rawUser) {
    console.info('解密并保存用户信息');
    return new Promise((resolve, reject) => {
      let url = `${this.globalData.baseUrl}/customers/decodeUserInfo`;
      let param = {
        encryptedData: rawUser.encryptedData,
        iv: rawUser.iv,
        sessionId: rawUser.thirdSessionId
      };
      //请求服务端解密数据
      wxRequest.getRequest(url, param).then(res => {
        //解密成功，缓存数据
        var user = res.data.data;
        if (user) {
          console.info(user);
          this.globalData.userInfo = user;
          wx.setStorageSync("userInfo", user);
          //临时user_id
          this.globalData.userId = user.id;
        }
        else {
          console.error("用户信息解密失败", res);
        }
      }, reject);
    });
  },

  globalData: {
    isReloadOrderList: false,
    userInfo: {},
    userId: null,
    shopId: "3",
    baseUrl: "http://leshare.shop:9999/v1/customer",
    imgUrl: "http://115.28.93.210"
  }
});