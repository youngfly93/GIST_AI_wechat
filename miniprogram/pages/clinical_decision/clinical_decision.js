// pages/clinical_decision/clinical_decision.js
import { getClinicalRecommendations } from '../../utils/aiService';

Page({

  /**
   * 页面的初始数据
   */
  data: {
    formData: {
      tumorSite: '',
      tumorSiteCode: '',
      tumorSize: '',
      sizeCategory: '',
      mitoticRate: '',
      mitoticCategory: '',
      mutationType: '',
      metastasis: false
    },
    // 肿瘤位置数据结构
    tumorSiteData: [
      { code: "ST", label: "胃", children: [
          { code: "ST_GEJ", label: "贲门/食管-胃交界" },
          { code: "ST_BODY", label: "胃体/胃底" },
          { code: "ST_ANT", label: "胃窦/幽门" }
      ]},
      { code: "SI", label: "小肠", children: [
          { code: "DU", label: "十二指肠" },
          { code: "JE", label: "空肠" },
          { code: "IL", label: "回肠" }
      ]},
      { code: "CR", label: "结直肠", children: [
          { code: "CO", label: "结肠" },
          { code: "RE", label: "直肠" }
      ]},
      { code: "ES", label: "食管" },
      { code: "AP", label: "阑尾" },
      { code: "OT", label: "其他消化道" },
      { code: "EGIST", label: "胃肠外/EGIST", children: [
          { code: "MES", label: "肠系膜" },
          { code: "OM",  label: "网膜" },
          { code: "PER", label: "腹膜/盆腔" },
          { code: "RETRO", label: "腹膜后" }
      ]},
      { code: "UNK", label: "待确定" }
    ],
    // 一级位置选择
    primarySiteOptions: [],
    primarySiteIndex: null,
    // 二级位置选择
    secondarySiteOptions: [],
    secondarySiteIndex: null,
    // 是否显示二级位置选择
    showSecondarySite: false,
    
    // 基因突变类型
    mutationTypes: [
      { category: "KIT", options: [
        { code: "KIT_E11", label: "KIT外显子11" },
        { code: "KIT_E9", label: "KIT外显子9" },
        { code: "KIT_E13_14", label: "KIT外显子13/14" },
        { code: "KIT_E17", label: "KIT外显子17" }
      ]},
      { category: "PDGFRA", options: [
        { code: "PDGFRA_D842V", label: "PDGFRA外显子18 D842V" },
        { code: "PDGFRA_NON_D842V", label: "PDGFRA外显子18 (非D842V)" },
        { code: "PDGFRA_E12", label: "PDGFRA外显子12" }
      ]},
      { category: "其他", options: [
        { code: "SDH_DEF", label: "SDH缺陷型" },
        { code: "NF1_ASSOC", label: "NF1型" },
        { code: "BRAF_V600E", label: "BRAF_V600E" },
        { code: "RAS", label: "RAS" }
      ]},
      { category: "未检出/未检测", options: [
        { code: "WILD", label: "野生型 (四阴性)" },
        { code: "NA", label: "未检测/待补录" }
      ]}
    ],
    mutationTypeOptions: [],
    mutationTypeIndex: null,
    
    isLoading: false,
    recommendationResult: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 初始化肿瘤位置选项
    const primarySiteOptions = this.data.tumorSiteData.map(site => site.label);
    
    // 初始化基因突变类型选项
    let mutationTypeOptions = [];
    this.data.mutationTypes.forEach(category => {
      category.options.forEach(option => {
        mutationTypeOptions.push(option.label);
      });
    });
    
    this.setData({
      primarySiteOptions,
      mutationTypeOptions,
      'formData.metastasis': false
    });
  },

  /**
   * 处理肿瘤大小输入，自动计算size_category
   */
  onTumorSizeInput(e) {
    const size = parseFloat(e.detail.value);
    let sizeCategory = '';
    
    if (!isNaN(size)) {
      if (size <= 2) {
        sizeCategory = 'S1';
      } else if (size <= 5) {
        sizeCategory = 'S2';
      } else if (size <= 10) {
        sizeCategory = 'S3';
      } else {
        sizeCategory = 'S4';
      }
    }
    
    this.setData({
      'formData.tumorSize': e.detail.value,
      'formData.sizeCategory': sizeCategory
    });
  },

  /**
   * 处理有丝分裂数输入，自动计算mitotic_category
   */
  onMitoticRateInput(e) {
    const rate = parseInt(e.detail.value);
    let mitoticCategory = '';
    
    if (!isNaN(rate)) {
      if (rate <= 5) {
        mitoticCategory = 'M1';
      } else if (rate <= 10) {
        mitoticCategory = 'M2';
      } else {
        mitoticCategory = 'M3';
      }
    }
    
    this.setData({
      'formData.mitoticRate': e.detail.value,
      'formData.mitoticCategory': mitoticCategory
    });
  },

  /**
   * 处理一级肿瘤位置选择
   */
  onPrimarySiteChange(e) {
    const index = parseInt(e.detail.value);
    const selectedSite = this.data.tumorSiteData[index];
    
    // 检查是否有子选项
    if (selectedSite.children && selectedSite.children.length > 0) {
      // 有子选项，显示二级选择
      const secondarySiteOptions = selectedSite.children.map(site => site.label);
      this.setData({
        primarySiteIndex: index,
        secondarySiteOptions,
        secondarySiteIndex: null,
        showSecondarySite: true,
        'formData.tumorSite': selectedSite.label,
        'formData.tumorSiteCode': '' // 清空之前的选择，等待二级选择
      });
    } else {
      // 没有子选项，直接使用当前选择
      this.setData({
        primarySiteIndex: index,
        showSecondarySite: false,
        secondarySiteIndex: null,
        'formData.tumorSite': selectedSite.label,
        'formData.tumorSiteCode': selectedSite.code
      });
    }
  },

  /**
   * 处理二级肿瘤位置选择
   */
  onSecondarySiteChange(e) {
    const primaryIndex = this.data.primarySiteIndex;
    const secondaryIndex = parseInt(e.detail.value);
    
    if (primaryIndex !== null && secondaryIndex !== null) {
      const primarySite = this.data.tumorSiteData[primaryIndex];
      const secondarySite = primarySite.children[secondaryIndex];
      
      this.setData({
        secondarySiteIndex: secondaryIndex,
        'formData.tumorSite': `${primarySite.label} - ${secondarySite.label}`,
        'formData.tumorSiteCode': secondarySite.code
      });
    }
  },

  /**
   * 处理基因突变类型选择
   */
  onMutationTypeChange(e) {
    const index = parseInt(e.detail.value);
    const selectedMutation = this.data.mutationTypeOptions[index];
    
    // 找到对应的code
    let mutationCode = '';
    for (const category of this.data.mutationTypes) {
      for (const option of category.options) {
        if (option.label === selectedMutation) {
          mutationCode = option.code;
          break;
        }
      }
      if (mutationCode) break;
    }
    
    this.setData({
      mutationTypeIndex: index,
      'formData.mutationType': mutationCode
    });
  },

  /**
   * 处理转移状态选择
   */
  onMetastasisChange(e) {
    this.setData({
      'formData.metastasis': e.detail.value === 'true'
    });
  },

  /**
   * 提交表单
   */
  async onSubmitForm(e) {
    // 基本验证
    const { tumorSiteCode, tumorSize, mitoticRate, mutationType } = this.data.formData;
    
    if (!tumorSiteCode || !tumorSize || !mitoticRate || !mutationType) {
      wx.showToast({
        title: '请填写所有必填项',
        icon: 'none'
      });
      return;
    }

    this.setData({ isLoading: true, recommendationResult: '' });

    // 构建JSON数据
    const patientData = {
      tumor_site: this.data.formData.tumorSiteCode,
      tumor_size_cm: parseFloat(this.data.formData.tumorSize),
      size_category: this.data.formData.sizeCategory,
      mitotic_rate_per_50hpf: parseInt(this.data.formData.mitoticRate),
      mitotic_category: this.data.formData.mitoticCategory,
      mutation_type: this.data.formData.mutationType,
      metastasis: this.data.formData.metastasis
    };

    try {
      // 将JSON数据转换为字符串，发送给AI服务
      const patientDataString = JSON.stringify(patientData, null, 2);
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