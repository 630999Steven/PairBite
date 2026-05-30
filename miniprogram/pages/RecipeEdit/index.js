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
    dishId: '',
    dishName: '',
    ingredients: '',
    steps: '',
    cookTime: COOK_TIME_OPTIONS[DEFAULT_COOK_TIME_INDEX].label,
    cookTimeOptions: COOK_TIME_OPTIONS,
    cookTimeIndex: DEFAULT_COOK_TIME_INDEX,
    difficulty: '简单',
    difficultyOptions: DIFFICULTY_OPTIONS,
    difficultyIndex: 0,
    saving: false,
    loadingDish: true,
    ingredientsHeight: 80,      // textarea 高度（rpx），由 estimateHeight 计算
    stepsHeight: 80,
  },

  onLoad(options) {
    const dishId = options.id || ''
    this.setData({ dishId })
    this.loadDish()
  },

  // 拉菜品已有信息（菜名 + 已有菜谱字段，便于编辑）
  async loadDish() {
    if (!this.data.dishId) {
      this.setData({ loadingDish: false })
      return
    }
    try {
      const res = await wx.cloud.callFunction({
        name: 'getCoupleData',
        data: {
          collection: app.globalData.collectionDishList,
          docId: this.data.dishId
        }
      })
      if (!res.result?.success) throw new Error(res.result?.message || '加载失败')
      const dish = res.result.data
      const difficulty = dish.difficulty && DIFFICULTY_OPTIONS.includes(dish.difficulty)
        ? dish.difficulty
        : '简单'
      const cookTimeIndex = matchCookTimeIndex(dish.cookTime)
      this.setData({
        dishName: dish.name || '',
        ingredients: dish.ingredients || '',
        steps: dish.steps || '',
        cookTime: COOK_TIME_OPTIONS[cookTimeIndex].label,
        cookTimeIndex,
        difficulty,
        difficultyIndex: DIFFICULTY_OPTIONS.indexOf(difficulty),
        ingredientsHeight: estimateHeight(dish.ingredients),
        stepsHeight: estimateHeight(dish.steps),
        loadingDish: false,
      })
    } catch (e) {
      console.error('load dish error', e)
      wx.showToast({ title: '加载失败', icon: 'none' })
      this.setData({ loadingDish: false })
    }
  },

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
    this.setData({
      difficultyIndex: idx,
      difficulty: DIFFICULTY_OPTIONS[idx]
    })
  },
  onCookTimeChange(e) {
    const idx = Number(e.detail.value)
    this.setData({
      cookTimeIndex: idx,
      cookTime: COOK_TIME_OPTIONS[idx].label
    })
  },

  async save() {
    if (this.data.saving) return
    if (!this.data.ingredients.trim() && !this.data.steps.trim()) {
      wx.showToast({ title: '菜谱不能为空', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'updateCoupleData',
        data: {
          collection: app.globalData.collectionDishList,
          docId: this.data.dishId,
          action: 'update',
          data: {
            ingredients: this.data.ingredients.trim(),
            steps: this.data.steps.trim(),
            cookTime: this.data.cookTime.trim(),
            difficulty: this.data.difficulty,
            recipeUpdateTime: new Date(),
          }
        }
      })
      if (!res.result?.success) throw new Error(res.result?.message || '保存失败')
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1000)
    } catch (e) {
      console.error('save recipe error', e)
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },
})
