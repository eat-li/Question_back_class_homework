<template>
  <view class="empty">
    <view class="empty-mark"></view>
    <text class="empty-text">{{ text }}</text>
    <text v-if="hint" class="empty-hint">{{ hint }}</text>
    <view v-if="actionText" class="empty-btn" @tap="$emit('action')">{{ actionText }}</view>
  </view>
</template>

<script>
export default {
  name: 'EmptyState',
  props: {
    text: { type: String, default: '这里还没有内容' },
    hint: { type: String, default: '' },
    actionText: { type: String, default: '' }
  }
}
</script>

<style>
.empty {
  padding: 140rpx 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.empty-mark {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 2rpx solid #d6dae0;
  margin-bottom: 28rpx;
}
.empty-text {
  font-size: 28rpx;
  color: #6b7280;
}
.empty-hint {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #9ca3af;
  text-align: center;
  line-height: 1.6;
}
.empty-btn {
  margin-top: 32rpx;
  padding: 14rpx 40rpx;
  border: 1rpx solid #4c8d74;
  border-radius: 8rpx;
  font-size: 26rpx;
  color: #4c8d74;
}
</style>
