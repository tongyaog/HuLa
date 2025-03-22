import apis from '@/services/apis'
import { UploadSceneEnum } from '@/enums'

export interface AvatarUploadOptions {
  // 上传成功后的回调函数，参数为下载URL
  onSuccess?: (downloadUrl: string) => void
  // 上传场景，默认为头像
  scene?: UploadSceneEnum
  // 文件大小限制（KB），默认为500KB
  sizeLimit?: number
}

/**
 * 上传头像的hook
 * @param options 上传配置
 */
export const useAvatarUpload = (options: AvatarUploadOptions = {}) => {
  const { onSuccess, scene = UploadSceneEnum.AVATAR, sizeLimit = 500 } = options

  const fileInput = ref<HTMLInputElement>()
  const localImageUrl = ref('')
  const showCropper = ref(false)
  const cropperRef = ref()

  // 打开文件选择器
  const openFileSelector = () => {
    fileInput.value?.click()
  }

  // 处理文件选择
  const handleFileChange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      // 添加文件大小限制检查
      if (file.size > sizeLimit * 1024) {
        window.$message.error(`图片大小不能超过${sizeLimit}KB`)
        if (fileInput.value) {
          fileInput.value.value = ''
        }
        return
      }

      // 先设置图片URL，等待图片加载完成后再显示裁剪窗口
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        window.$message.error('只支持 JPG、PNG、WebP 格式的图片')
        if (fileInput.value) {
          fileInput.value.value = ''
        }
        return
      }

      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        localImageUrl.value = url

        nextTick(() => {
          showCropper.value = true
        })
      }

      img.onerror = () => {
        window.$message.error('图片加载失败')
        URL.revokeObjectURL(url)
      }

      img.src = url
    }
  }

  // 处理裁剪
  const handleCrop = async (cropBlob: Blob) => {
    try {
      const fileName = `avatar_${Date.now()}.png`
      const file = new File([cropBlob], fileName, { type: 'image/png' })

      // 1. 获取上传URL
      const { uploadUrl, downloadUrl } = await apis.getUploadUrl({
        fileName: fileName,
        scene: scene
      })

      // 2. 上传文件
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: file,
        duplex: 'half'
      } as RequestInit)

      if (!response.ok) {
        throw new Error('文件上传失败')
      }

      // 3. 调用成功回调
      if (onSuccess) {
        onSuccess(downloadUrl)
      }

      // 清理资源
      if (localImageUrl.value) {
        URL.revokeObjectURL(localImageUrl.value)
      }
      localImageUrl.value = ''
      if (fileInput.value) {
        fileInput.value.value = ''
      }

      // 结束加载状态
      cropperRef.value?.finishLoading()
      // 关闭裁剪窗口
      showCropper.value = false
    } catch (error) {
      console.error('上传头像失败:', error)
      window.$message.error('上传头像失败')
      // 发生错误时也需要结束加载状态
      cropperRef.value?.finishLoading()
    }
  }

  return {
    fileInput,
    localImageUrl,
    showCropper,
    cropperRef,
    openFileSelector,
    handleFileChange,
    handleCrop
  }
}
