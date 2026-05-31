const app = getApp()
const {
  DIFFICULTY_OPTIONS,
  COOK_TIME_OPTIONS,
  DEFAULT_COOK_TIME_INDEX,
  matchCookTimeIndex,
  estimateHeight,
} = require('../../utils/recipe.js')

Page({
  data: {
    _id: '',
    name: '',
    description: '',
    imageUrl: '',
    tempFilePath: '',
    isEdit: false,
    categories: [],
    categoryIndex: 0,
    saving: false,

    // 菜谱字段（可选填）
    ingredients: '',
    steps: '',
    cookTime: COOK_TIME_OPTIONS[DEFAULT_COOK_TIME_INDEX].label,
    cookTimeOptions: COOK_TIME_OPTIONS,
    cookTimeIndex: DEFAULT_COOK_TIME_INDEX,
    difficulty: '简单',
    difficultyOptions: DIFFICULTY_OPTIONS,
    difficultyIndex: 0,
    ingredientsHeight: 80,
    stepsHeight: 80,
  },

  async onLoad(options) {
    await app.loadCategories()
    this.setData({ categories: app.globalData.categories })
    if (options.id) {
      this.setData({ _id: options.id, isEdit: true })
      wx.setNavigationBarTitle({ title: '编辑菜品' })
      // 编辑模式直接在 onLoad 里把字段回填，避免 onShow 早于 onLoad 完成的竞态
      await this.loadDish()
    }
  },

  // 加载菜品信息（编辑模式）
  async loadDish() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'getCoupleData',
        data: {
          collection: app.globalData.collectionDishList,
          docId: this.data._id
        }
      })

      if (!res.result?.success) {
        throw new Error(res.result?.message || '加载失败')
      }

      const dish = res.result.data
      const categoryIndex = this.data.categories.findIndex(c => c._id === dish.category) || 0
      const difficulty = dish.difficulty && DIFFICULTY_OPTIONS.includes(dish.difficulty)
        ? dish.difficulty
        : '简单'
      const cookTimeIndex = matchCookTimeIndex(dish.cookTime)
      this.setData({
        name: dish.name,
        description: dish.description || '',
        imageUrl: dish.imageUrl || '',
        categoryIndex: categoryIndex >= 0 ? categoryIndex : 0,
        ingredients: dish.ingredients || '',
        steps: dish.steps || '',
        cookTime: COOK_TIME_OPTIONS[cookTimeIndex].label,
        cookTimeIndex,
        difficulty,
        difficultyIndex: DIFFICULTY_OPTIONS.indexOf(difficulty),
        ingredientsHeight: estimateHeight(dish.ingredients),
        stepsHeight: estimateHeight(dish.steps),
      })
    } catch (e) {
      console.error('加载菜品失败', e)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 输入菜品名称
  onNameInput(e) {
    let value = e.detail.value
    if (value.length > 20) value = value.slice(0, 20)
    this.setData({ name: value })
    return value
  },

  // 输入菜品描述
  onDescInput(e) {
    let value = e.detail.value
    if (value.length > 6) value = value.slice(0, 6)
    this.setData({ description: value })
    return value
  },

  // 选择分类
  onCategoryChange(e) {
    this.setData({ categoryIndex: e.detail.value })
  },

  // 菜谱字段输入
  onIngredientsInput(e) {
    const v = e.detail.value
    this.setData({ ingredients: v, ingredientsHeight: estimateHeight(v) })
  },
  onStepsInput(e) {
    const v = e.detail.value
    this.setData({ steps: v, stepsHeight: estimateHeight(v) })
  },
  onDifficultyChange(e) {
    const idx = Number(e.detail.value)
    this.setData({ difficultyIndex: idx, difficulty: DIFFICULTY_OPTIONS[idx] })
  },
  onCookTimeChange(e) {
    const idx = Number(e.detail.value)
    this.setData({ cookTimeIndex: idx, cookTime: COOK_TIME_OPTIONS[idx].label })
  },

  // 清空已选的图片
  clearImage() {
    this.setData({ imageUrl: '', tempFilePath: '' })
  },

  // 选择图片
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.setData({
          tempFilePath,
          imageUrl: tempFilePath
        })
      }
    })
  },

  // 上传图片到云存储
  async uploadImage() {
    if (!this.data.tempFilePath) return ''

    const cloudPath = `dishes/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`

    try {
      const res = await wx.cloud.uploadFile({
        cloudPath,
        filePath: this.data.tempFilePath
      })
      return res.fileID
    } catch (e) {
      console.error('上传图片失败', e)
      throw new Error('图片上传失败')
    }
  },

  // 保存菜品
  async saveDish() {
    if (!app.isBound()) {
      wx.showToast({ title: '请先绑定伴侣', icon: 'none' })
      return
    }

    const { name, saving, isEdit, _id } = this.data

    if (saving) return

    if (!name.trim()) {
      wx.showToast({ title: '请输入菜品名称', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    wx.showLoading({ title: '保存中...' })

    try {
      let imageUrl = this.data.imageUrl

      // 如果有新选择的图片，上传新图片
      if (this.data.tempFilePath) {
        imageUrl = await this.uploadImage()
      }

      const db = await app.database()

      const category = this.data.categories[this.data.categoryIndex]._id

      // 菜谱字段：有食材或步骤就视为填了；否则各字段写空，避免默认值污染
      const hasRecipe = !!(this.data.ingredients.trim() || this.data.steps.trim())
      const baseData = {
        name: name.trim(),
        description: this.data.description.trim(),
        imageUrl,
        category,
        ingredients: hasRecipe ? this.data.ingredients.trim() : '',
        steps: hasRecipe ? this.data.steps.trim() : '',
        cookTime: hasRecipe ? this.data.cookTime : '',
        difficulty: hasRecipe ? this.data.difficulty : '',
      }

      if (isEdit) {
        // 编辑模式：更新现有记录
        const res = await wx.cloud.callFunction({
          name: 'updateCoupleData',
          data: {
            collection: app.globalData.collectionDishList,
            docId: _id,
            action: 'update',
            data: { ...baseData, updateTime: new Date() }
          }
        })

        wx.hideLoading()

        if (!res.result?.success) {
          wx.showToast({ title: res.result?.message || '修改失败', icon: 'none' })
          return
        }

        wx.showToast({ title: '修改成功', icon: 'success' })
      } else {
        // 新增模式（带上 coupleId）
        const coupleId = app.globalData.currentUser?.coupleId || ''
        await db.collection(app.globalData.collectionDishList).add({
          data: {
            ...baseData,
            coupleId,
            createTime: db.serverDate(),
          }
        })
        wx.hideLoading()
        wx.showToast({ title: '添加成功', icon: 'success' })
      }

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)

    } catch (e) {
      console.error('保存失败', e)
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
      this.setData({ saving: false })
    }
  },

  // 重置表单
  resetForm() {
    this.setData({
      name: '',
      description: '',
      imageUrl: '',
      tempFilePath: '',
      categoryIndex: 0,
      ingredients: '',
      steps: '',
      cookTime: COOK_TIME_OPTIONS[DEFAULT_COOK_TIME_INDEX].label,
      cookTimeIndex: DEFAULT_COOK_TIME_INDEX,
      difficulty: '简单',
      difficultyIndex: 0,
      ingredientsHeight: 80,
      stepsHeight: 80,
    })
  },
})
