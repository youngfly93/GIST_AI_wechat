Page({
  data: {
    externalUrl: ''
  },
  onLoad: function (options) {
    if (options.url) {
      this.setData({
        externalUrl: decodeURIComponent(options.url)
      });
    }
  }
}); 