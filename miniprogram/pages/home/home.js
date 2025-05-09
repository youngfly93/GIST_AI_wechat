// pages/home/home.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    bannerImagePath: '/images/gist_platform_banner.png' // Store path for easier access
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // Page load logic
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  previewBannerImage: function() {
    wx.previewImage({
      current: this.data.bannerImagePath, // URL of the image to be currently displayed
      urls: [this.data.bannerImagePath], // List of URLs of images to be previewed
      showmenu: true, // Explicitly set to true, though it's the default
      success: function(res) {
        console.log('Preview success:', res);
      },
      fail: function(err) {
        console.error('Preview failed:', err);
        wx.showToast({
          title: '图片预览失败',
          icon: 'none'
        });
      }
    });
  },

  // Add navigation functions or other logic as needed
})