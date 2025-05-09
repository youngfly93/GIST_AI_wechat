// pages/clinical_decision/clinical_decision.js
import { getClinicalRecommendations } from '../../utils/aiService';

Page({

  /**
   * 页面的初始数据
   */
  data: {
    formData: {
      tumorLocation: '',
      tumorSize: '',
      mitoticCount: '',
      mutationType: '',
      metastasis: '' // Default to 'no' or some initial value if appropriate
    },
    tumorLocationOptions: ['胃', '小肠', '结直肠', '食管', '其他'], // Example options
    tumorLocationIndex: null,
    mutationTypeOptions: ['KIT外显子11', 'KIT外显子9', 'KIT外显子13', 'KIT外显子17', 'PDGFRA外显子12', 'PDGFRA外显子18 D842V', 'PDGFRA外显子18 (非D842V)', 'SDH缺陷型', 'NF1型', '野生型 (无常见突变)', '其他', '未知'],
    mutationTypeIndex: null,
    metastasisOptions: [
      { name: '是', value: 'yes' },
      { name: '否', value: 'no', checked: 'true' } // Default to No
    ],
    isLoading: false,
    recommendationResult: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // Initialize form data if needed, e.g., set default metastasis
    this.setData({
      'formData.metastasis': 'no' // Pre-select 'No' for metastasis
    });
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

  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  bindPickerChange(e) {
    const field = e.currentTarget.dataset.field || e.currentTarget.name; // tumorLocation uses name, mutationType uses data-field in this example
    const index = e.detail.value;
    if (field === 'tumorLocation') {
      this.setData({
        tumorLocationIndex: index,
        'formData.tumorLocation': this.data.tumorLocationOptions[index]
      });
    } else if (field === 'mutationType') {
      this.setData({
        mutationTypeIndex: index,
        'formData.mutationType': this.data.mutationTypeOptions[index]
      });
    }
  },
  
  onRadioChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  async onSubmitForm(e) {
    // Basic validation (can be more extensive)
    const { tumorLocation, tumorSize, mitoticCount, mutationType, metastasis } = this.data.formData;
    if (!tumorLocation || !tumorSize || !mitoticCount || !mutationType || !metastasis) {
      wx.showToast({
        title: '请填写所有必填项',
        icon: 'none'
      });
      return;
    }

    this.setData({ isLoading: true, recommendationResult: '' });

    // Construct patientData string for the AI
    const patientDataString = 
`患者信息：
肿瘤位置：${tumorLocation}
肿瘤大小：${tumorSize} cm
有丝分裂数：${mitoticCount}/50HPF
基因突变类型：${mutationType}
是否有转移：${metastasis === 'yes' ? '是' : '否'}`;
// Add any other fields from formData to this string

    try {
      const response = await getClinicalRecommendations(patientDataString);
      if (response.success && response.content) {
        this.setData({ recommendationResult: response.content });
      } else {
        this.setData({ recommendationResult: `获取建议失败：${response.error || '未知AI错误'}` });
        console.error("Clinical Recommendation AI Error:", response);
      }
    } catch (error) {
      this.setData({ recommendationResult: '获取建议时发生网络错误，请稍后再试。' });
      console.error("Error calling getClinicalRecommendations:", error);
    }

    this.setData({ isLoading: false });
  }
})