<script>
export default {
  onLaunch() {
    // 首屏就要能看到内容，所以这里不做任何阻塞性初始化。
    // 访客令牌由 utils/request.js 在第一次请求时懒加载。
  }
}
</script>

<style>
page {
  background: #f5f6f8;
}
</style>
