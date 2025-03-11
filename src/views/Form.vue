<!--
 * @Version    : v1.00
 * @Author     : itchaox
 * @Date       : 2023-09-26 15:10
 * @LastAuthor : Wang Chao
 * @LastTime   : 2025-03-11 15:53
 * @desc       : Markdown 预览插件
-->
<script setup>
  import { onMounted, watch, ref, watchEffect } from 'vue';
  import { ArrowUp } from '@element-plus/icons-vue';
  import { bitable } from '@lark-base-open/js-sdk';
  import html2canvas from 'html2canvas';

  import opencc from 'node-opencc';
  import { ElMessage, ElButton, ElDialog } from 'element-plus';
  import {
    ArrowLeft,
    ArrowRight,
    DocumentCopy,
    Download,
    Picture,
    Edit,
    ChatRound,
    Setting,
    View,
    CopyDocument,
    UserFilled,
  } from '@element-plus/icons-vue';

  import MarkdownIt from 'markdown-it';

  import { useI18n } from 'vue-i18n';
  const { t } = useI18n();

  // 赞助我弹窗控制
  const sponsorDialogVisible = ref(false);

  // 设置弹窗控制
  const settingDialogVisible = ref(false);

  // 编辑状态控制
  const isEditing = ref(false);

  // 默认配置输入值
  const defaultConfig = ref('');

  // 生成后的表格地址
  const newFormUrl = ref('');

  // 处理预览按钮点击事件
  const handlePreview = () => {
    window.open(newFormUrl.value, '_blank');
  };

  // 处理复制地址按钮点击事件
  async function handleCopy() {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = newFormUrl.value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      ElMessage.success({
        message: '复制地址成功',
        offset: 120,
        duration: 1500,
      });
    } catch (err) {
      ElMessage.error('复制地址失败');
    }
  }

  // 处理生成配置按钮点击事件
  const handleGenerate = () => {
    if (!defaultConfig.value) {
      ElMessage.warning('请输入多维表格地址!');
      return;
    }
    // 配置生成后的表格地址,携带插件的插件 id
    newFormUrl.value = defaultConfig.value + '&extension_market_extension_id=replit_3f456ac5d10f23e6';

    ElMessage.success('新多维表格地址已生成~');
  };

  // 关闭设置弹窗并清空输入框
  const closeSettingDialog = () => {
    settingDialogVisible.value = false;
    defaultConfig.value = '';
    newFormUrl.value = '';
  };

  // 处理加入群组点击事件
  const handleJoinGroup = () => {
    window.open(
      'https://applink.feishu.cn/client/chat/chatter/add_by_link?link_token=41el7f3d-7b8e-4e71-920c-1e642ad191fc',
      '_blank',
    );
  };

  // 联系开发者
  const handleJoinUser = () => {
    window.open(
      'https://www.feishu.cn/invitation/page/add_contact/?token=88cn07b8-51c8-4079-aa60-55e4f9b20356&amp;unique_id=Gnsbjoqg2I2_moNlm8d5dg==',
      '_blank',
    );
  };

  const editor = ref(null);
  const isTextField = ref(false); // 是否为文本字段

  // 当前点击字段id
  const currentFieldId = ref();
  const recordId = ref();

  // 检查字段类型
  async function checkFieldType() {
    try {
      const table = await bitable.base.getActiveTable();
      const field = await table.getField(currentFieldId.value);
      isTextField.value = field.type === 'Text' || field.type === 1;
    } catch (error) {
      console.error('获取字段类型失败:', error);
      isTextField.value = false;
    }
  }

  // 监听字段变化
  watchEffect(async () => {
    if (currentFieldId.value) {
      await checkFieldType();
    }
  });

  // 组件挂载时初始化字段类型检查
  onMounted(async () => {
    if (currentFieldId.value) {
      await checkFieldType();
    }
  });

  // 返回顶部按钮显示控制
  const showBackToTop = ref(false);
  const showBackToTopAnswer = ref(false);

  // 监听滚动事件
  function handleScroll(event) {
    const target = event.target;
    const scrollHeight = target.scrollHeight; // 内容总高度
    const clientHeight = target.clientHeight; // 可视区域高度
    const scrollTop = target.scrollTop; // 已滚动高度

    // 当滚动超过一定距离时显示按钮（这里设置为500px）
    showBackToTop.value = scrollTop > 500;
  }

  // 监听回答区域滚动事件
  function handleAnswerScroll(event) {
    const target = event.target;
    const scrollTop = target.scrollTop; // 已滚动高度

    // 当滚动超过一定距离时显示按钮（这里设置为500px）
    showBackToTopAnswer.value = scrollTop > 500;
  }

  // 返回顶部
  function scrollToTop() {
    const previewContent = document.querySelector('.cell-preview');
    if (previewContent) {
      previewContent.scrollTop = 0;
    }
  }

  // 回答区域返回顶部
  function scrollAnswerToTop() {
    const answerContent = document.querySelector('.answer-content');
    if (answerContent) {
      answerContent.scrollTop = 0;
    }
  }

  // 切换编辑状态
  function toggleEditing() {
    if (previewMode.value === 'normal') {
      // 在普通预览模式下，切换编辑状态
      isEditing.value = !isEditing.value;
      return;
    }

    if (isEditing.value) {
      stopEditing();
    } else {
      startEditing();
    }
  }

  // 开始编辑
  function startEditing() {
    if (!currentValue.value) return;
    isEditing.value = true;
    // 等待 DOM 更新后设置焦点
    nextTick(() => {
      if (editor.value) {
        editor.value.focus();
      }
    });
  }

  // 停止编辑
  async function stopEditing() {
    if (!isEditing.value) return;
    isEditing.value = false;
    // 更新多维表格中的值
    try {
      const table = await bitable.base.getActiveTable();
      const field = await table.getField(lastSelectedFieldId.value);
      await field.setValue(lastSelectedRecordId.value, currentValue.value);
    } catch (error) {
      console.error('更新单元格失败:', error);
      ElMessage.error('更新失败');
    }
  }

  // 处理输入
  function handleInput() {
    // 实时更新预览内容
    parsedContent.value = md.render(currentValue.value || '');
  }

  // 处理按键事件
  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const text = currentValue.value;
      const lines = text.split('\n');
      const currentLine = lines[lines.length - 1];

      // 匹配有序列表（如：1. 2. 3.）
      const orderedMatch = currentLine.match(/^(\d+)\. /);
      // 匹配无序列表（如：- * +）
      const unorderedMatch = currentLine.match(/^([\-\*\+]) /);

      if (orderedMatch) {
        const num = parseInt(orderedMatch[1]);
        lines.push(`${num + 1}. `);
      } else if (unorderedMatch) {
        lines.push(`${unorderedMatch[1]} `);
      } else {
        lines.push('');
      }

      currentValue.value = lines.join('\n');
      handleInput();
    }
  }

  // 复制内容函数
  function copyContent() {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = currentValue.value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      ElMessage.success({
        message: t('preview.copy.success'),
        offset: 120,
        duration: 1500,
      });
    } catch (err) {
      ElMessage.error(t('preview.copy.error'));
    }
  }

  // 下载为图片
  async function downloadAsImage() {
    try {
      const previewContent = document.querySelector('.preview-content');
      if (!previewContent) return;

      // 确保所有样式都被正确应用
      const canvas = await html2canvas(previewContent, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const clonedContent = clonedDoc.querySelector('.preview-content');
          if (clonedContent) {
            // 添加所有必要的样式
            const style = document.createElement('style');
            style.textContent = `
                .preview-content {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif,
                    'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
                  font-size: 14px;
                  line-height: 1.6;
                  color: #1f2329;
                  padding: 8px 12px;
                }

                .preview-content h1,
                .preview-content h2,
                .preview-content h3,
                .preview-content h4,
                .preview-content h5,
                .preview-content h6 {
                  margin: 20px 0 12px;
                  font-weight: 600;
                  line-height: 1.4;
                  color: #1f2329;
                }

                .preview-content h1 {
                  font-size: 26px;
                  margin-top: 28px;
                }

                .preview-content h2 {
                  font-size: 22px;
                }

                .preview-content h3 {
                  font-size: 18px;
                }

                .preview-content h4 {
                  font-size: 16px;
                }

                .preview-content h5 {
                  font-size: 14px;
                }

                .preview-content h6 {
                  font-size: 14px;
                  color: #646a73;
                }

                .preview-content p {
                  margin: 12px 0;
                  line-height: 1.6;
                }

                .preview-content ul,
                .preview-content ol {
                  padding-left: 1.5em;
                  margin: 12px 0;
                }

                .preview-content ul {
                  list-style: disc;
                }

                .preview-content ol {
                  list-style: decimal;
                }

                .preview-content ul ul,
                .preview-content ol ul {
                  list-style: circle;
                }

                .preview-content ul ul ul,
                .preview-content ol ul ul,
                .preview-content ul ol ul,
                .preview-content ol ol ul {
                  list-style: square;
                }

                .preview-content li {
                  margin: 6px 0;
                  line-height: 1.6;
                }

                .preview-content li::marker {
                  color: #2955e7;
                }

                .preview-content pre {
                  margin: 16px 0;
                  padding: 16px;
                  background-color: #f5f6f7;
                  border-radius: 4px;
                  overflow-x: auto;
                }

                .preview-content code {
                  font-family: Menlo, Monaco, Consolas, 'Courier New', monospace;
                  font-size: 12px;
                  padding: 2px 4px;
                  background-color: rgba(0, 0, 0, 0.06);
                  border-radius: 3px;
                }

                .preview-content pre code {
                  padding: 0;
                  background-color: transparent;
                }

                .preview-content blockquote {
                  margin: 16px 0;
                  padding: 0 16px;
                  color: #646a73;
                  border-left: 4px solid #e5e6eb;
                }

                .preview-content table {
                  margin: 16px 0;
                  border-collapse: collapse;
                  width: 100%;
                }

                .preview-content th,
                .preview-content td {
                  padding: 8px 16px;
                  border: 1px solid #e5e6eb;
                }

                .preview-content th {
                  background-color: #f5f6f7;
                  font-weight: 500;
                }

                .preview-content a {
                  color: #3370ff;
                  text-decoration: none;
                }

                .preview-content a:hover {
                  text-decoration: underline;
                }

                .preview-content hr {
                  margin: 16px 0;
                  border: none;
                  border-top: 1px solid #e5e6eb;
                }

                .preview-content img {
                  max-width: 100%;
                  margin: 16px 0;
                }

                ol {
                  list-style: decimal;
                }

                ul {
                  list-style: disc;
                }

                ol ul {
                  list-style: circle;
                }

                ul ul {
                  list-style: circle;
                }

                ul ul ul {
                  list-style: square;
                }

                ul ul ul ul {
                  list-style: disc;
                }

                ul ul ul ul ul {
                  list-style: circle;
                }

                ul ul ul ul ul ul {
                  list-style: square;
                }

                ol li,
                ul li {
                  color: inherit;
                }

                ol li::marker,
                ul li::marker {
                  color: #2955e7 !important;
                }

                ol > li,
  ul > li {
    color: #2955e7;

    ol,
  ul {
    color: #2955e7;
  }
  }

  /* 使用伪元素实现列表标记 */
  .preview-content ul > li::before {
    content: '';
    position: absolute;
    left: -2em;
    top: 0.8em;
    width: 0.4em;
    height: 0.4em;
    background-color: #2955e7;
    border-radius: 50%;
    transform: translateY(-50%);
  }

  .preview-content ol > li::before {
    content: counter(item) '.';
    counter-increment: item;
    position: absolute;
    left: -1.3em;
    width: 1em;
    text-align: right;
    color: #2955e7;
    font-size: 14px;
    font-weight: 600;
  }
              `;
            clonedDoc.head.appendChild(style);
          }
        },
      });
      const link = document.createElement('a');
      // 设置文件名为"当前字段-当前行数"的格式
      const fileName = `${currentFieldName.value}-${currentRecordIndex.value + 1}.png`;
      link.download = fileName;
      link.href = canvas.toDataURL('image/png');
      link.click();
      ElMessage.success({
        message: t('preview.download.success'),
        offset: 120,
        duration: 1500,
      });
    } catch (err) {
      ElMessage.error(t('preview.download.error'));
    }
  }

  // 复制问题内容
  function copyQuestionContent() {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = questionContent.value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      ElMessage.success({
        message: t('preview.copy.success'),
        offset: 120,
        duration: 1500,
      });
    } catch (err) {
      ElMessage.error(t('preview.copy.error'));
    }
  }

  // 复制回答内容
  function copyAnswerContent() {
    try {
      const textarea = document.createElement('textarea');
      // 修改为使用 currentValue.value 而不是 parsedAnswerContent.value，因为 parsedAnswerContent 包含了 HTML 标签
      textarea.value = currentValue.value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      ElMessage.success({
        message: t('preview.copy.success'),
        offset: 120,
        duration: 1500,
      });
    } catch (err) {
      ElMessage.error(t('preview.copy.error'));
    }
  }

  // 关注我函数
  function followAuthor() {
    window.open('https://space.bilibili.com/521041866', '_blank');
  }

  // 预览模式：normal 普通预览; ai AI问答
  const previewMode = ref('normal');

  // 目标格式 s 简体; t 繁体
  const target = ref('t');

  // 选择模式 cell 单元格; field 字段; database 数据表
  const selectModel = ref('cell');

  const databaseList = ref();
  const databaseId = ref();
  const viewList = ref();
  const viewId = ref();
  const fieldList = ref();
  const fieldId = ref();

  const isLoading = ref(false);

  const base = bitable.base;

  // 保存最后一次选中的字段ID和记录ID
  const lastSelectedFieldId = ref('');
  const lastSelectedRecordId = ref('');

  // 切换到上一行
  async function prevRecord() {
    if (!lastSelectedFieldId.value || !lastSelectedRecordId.value) return;
    const currentIndex = recordIds.value.findIndex((id) => id === lastSelectedRecordId.value);
    if (currentIndex > 0) {
      const table = await bitable.base.getActiveTable();
      await table.setSelection({
        fieldId: lastSelectedFieldId.value,
        recordId: recordIds.value[currentIndex - 1],
      });
    }
  }

  // 切换到下一行
  async function nextRecord() {
    if (!lastSelectedFieldId.value || !lastSelectedRecordId.value) return;
    const currentIndex = recordIds.value.findIndex((id) => id === lastSelectedRecordId.value);
    if (currentIndex < recordIds.value.length - 1) {
      const table = await bitable.base.getActiveTable();
      await table.setSelection({
        fieldId: lastSelectedFieldId.value,
        recordId: recordIds.value[currentIndex + 1],
      });
    }
  }
  const currentValue = ref();
  const currentRecordIndex = ref(-1);
  const recordIds = ref([]);

  // AI 问答模式字段 ID
  const questionFieldId = ref('');
  const answerFieldId = ref('');
  const questionFieldName = ref('');
  const answerFieldName = ref('');

  // 繁体模式 1 正体繁体; 2 台湾繁体; 3 香港繁体
  const traditionalModel = ref('1');

  // 地域模式 1 不使用; 2 台湾模式
  const localModel = ref('1');

  onMounted(async () => {
    databaseList.value = await base.getTableMetaList();
    await updateRecordIds();

    // 获取当前视图的字段列表
    const selection = await base.getSelection();
    if (selection.tableId && selection.viewId) {
      const table = await base.getTable(selection.tableId);
      const view = await table.getViewById(selection.viewId);
      const _list = await view.getFieldMetaList();
      console.log('🚀  _list:', _list);

      // 只展示文本和公式类型字段
      fieldList.value = _list.filter((item) => item.type === 1 || item.type === 20);
    }
  });

  async function updateRecordIds() {
    const table = await base.getActiveTable();
    if (!table) return;

    // 获取当前视图的记录 ID 列表
    const selection = await base.getSelection();
    const view = await table.getViewById(selection.viewId);
    const records = await view.getVisibleRecordIdList();
    recordIds.value = records;
  }

  async function switchRecord(direction) {
    // 使用当前字段ID或最后一次选中的字段ID
    const fieldIdToUse = currentFieldId.value || lastSelectedFieldId.value;
    const recordIdToUse = recordId.value || lastSelectedRecordId.value;

    if (!fieldIdToUse || recordIds.value.length === 0) return;

    const currentIndex = recordIds.value.findIndex((id) => id === recordIdToUse);
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : recordIds.value.length - 1;
    } else {
      newIndex = currentIndex < recordIds.value.length - 1 ? currentIndex + 1 : 0;
    }

    recordId.value = recordIds.value[newIndex];
    currentRecordIndex.value = newIndex;

    const table = await base.getActiveTable();

    if (previewMode.value === 'ai' && questionFieldId.value && answerFieldId.value) {
      // AI 问答模式：获取问题和回答内容
      const questionData = await table.getCellValue(questionFieldId.value, recordId.value);
      const answerData = await table.getCellValue(answerFieldId.value, recordId.value);

      // 即使内容为空也设置值，以保持区域显示
      const questionText = questionData?.map((item) => item.text.replace(/\n$/, '')).join('\n') || '';
      questionContent.value = questionText || `❗︎${t('preview.no_data')}`;
      const answerText = answerData?.map((item) => item.text.replace(/\n$/, '')).join('\n') || '';
      currentValue.value = answerText;
      parsedAnswerContent.value = answerText
        ? md.render(answerText)
        : `<div class="empty-content">❗︎${t('preview.no_data')}</div>`;
    } else {
      // 普通预览模式
      const data = await table.getCellValue(fieldIdToUse, recordId.value);
      if (data && data.length) {
        currentValue.value = data.map((item) => item.text.replace(/\n$/, '')).join('\n');
        parsedContent.value = md.render(currentValue.value || '');
      } else {
        currentValue.value = '';
        parsedContent.value = `<div class="empty-content">❗︎${t('preview.no_data')}</div>`;
      }
    }

    // 重置预览区域的滚动位置到顶部
    const previewContentDom = document.querySelector('.cell-preview');
    const questionContentDom = document.querySelector('.question-content');
    const answerContentDom = document.querySelector('.answer-content');

    if (previewMode.value === 'ai') {
      if (questionContentDom) questionContentDom.scrollTop = 0;
      if (answerContentDom) answerContentDom.scrollTop = 0;
    } else if (previewContentDom) {
      previewContentDom.scrollTop = 0;
    }
  }

  // 更新预览内容
  async function updatePreview() {
    const table = await base.getActiveTable();
    if (!table) return;

    if (previewMode.value === 'ai' && questionFieldId.value && answerFieldId.value) {
      // AI 问答模式：获取问题和回答内容
      const questionData = await table.getCellValue(
        questionFieldId.value,
        recordId.value || lastSelectedRecordId.value,
      );
      const answerData = await table.getCellValue(answerFieldId.value, recordId.value || lastSelectedRecordId.value);

      questionContent.value =
        questionData?.map((item) => item.text.replace(/\n$/, '')).join('\n') || `❗︎${t('preview.no_data')}`;
      parsedAnswerContent.value = md.render(answerData?.map((item) => item.text.replace(/\n$/, '')).join('\n') || '');
    } else {
      // 普通预览模式
      const data = await table.getCellValue(
        currentFieldId.value || lastSelectedFieldId.value,
        recordId.value || lastSelectedRecordId.value,
      );
      if (data && data.length) {
        currentValue.value = data.map((item) => item.text.replace(/\n$/, '')).join('\n');
        parsedContent.value = md.render(currentValue.value || '');
      } else {
        currentValue.value = '';
        parsedContent.value = `<div class="empty-content">❗︎${t('preview.no_data')}</div>`;
      }
    }

    // 重置预览区域的滚动位置到顶部
    const previewContentDom = document.querySelector('.cell-preview');
    const questionContentDom = document.querySelector('.question-content');
    const answerContentDom = document.querySelector('.answer-content');

    if (previewMode.value === 'ai') {
      if (questionContentDom) questionContentDom.scrollTop = 0;
      if (answerContentDom) answerContentDom.scrollTop = 0;
    } else if (previewContentDom) {
      previewContentDom.scrollTop = 0;
    }
  }

  // 切换字段
  async function switchField(direction) {
    if (!fieldList.value || fieldList.value.length === 0) return;

    const currentIndex = fieldList.value.findIndex(
      (field) => field.id === (currentFieldId.value || lastSelectedFieldId.value),
    );
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : fieldList.value.length - 1;
    } else {
      newIndex = currentIndex < fieldList.value.length - 1 ? currentIndex + 1 : 0;
    }

    const newField = fieldList.value[newIndex];
    currentFieldId.value = newField.id;
    lastSelectedFieldId.value = newField.id;

    // 更新字段名称
    const table = await base.getTable(databaseId.value);
    const field = await table.getFieldById(newField.id);
    const fieldMeta = await field.getMeta();
    currentFieldName.value = fieldMeta.name;

    // 更新预览内容
    await updatePreview();
  }

  // 切换数据表, 默认选择第一个视图
  async function databaseChange() {
    if (selectModel.value === 'field') {
      const table = await base.getTable(databaseId.value);
      viewList.value = await table.getViewMetaList();
      viewId.value = viewList.value[0]?.id;
    }
  }

  // 根据视图列表获取字段列表
  watch(viewId, async (newValue, oldValue) => {
    const table = await base.getTable(databaseId.value);
    const view = await table.getViewById(newValue);
    const _list = await view.getFieldMetaList();
    console.log('🚀  _list:', _list);

    // 只展示文本相关字段
    fieldList.value = _list.filter((item) => item.type === 1 || item.type === 20);
  });

  // 监听问答字段变化
  watch([questionFieldId, answerFieldId], async () => {
    if (previewMode.value === 'ai' && questionFieldId.value && answerFieldId.value && recordId.value) {
      const table = await bitable.base.getActiveTable();
      // 更新问答内容
      const questionData = await table.getCellValue(questionFieldId.value, recordId.value);
      const answerData = await table.getCellValue(answerFieldId.value, recordId.value);

      questionContent.value = questionData?.[0]?.text || '';
      parsedAnswerContent.value = md.render(answerData?.[0]?.text || '');
    }
  });

  // 切换选择模式时,重置选择
  watch(selectModel, async (newValue, oldValue) => {
    if (newValue === 'cell') return;
    // 单列和数据表模式，默认选中当前数据表和当前视图

    const selection = await base.getSelection();
    databaseId.value = selection.tableId;

    if (newValue === 'field') {
      fieldId.value = '';
      fieldList.value = [];
      viewId.value = '';

      const table = await base.getTable(databaseId.value);
      viewList.value = await table.getViewMetaList();
      viewId.value = selection.viewId;
    }
  });

  // 数据表修改后，自动获取视图列表
  watchEffect(async () => {
    const table = await base.getTable(databaseId.value);
    viewList.value = await table.getViewMetaList();
  });

  // 初始化 markdown-it，配置安全选项
  const md = new MarkdownIt({
    html: false, // 禁用 HTML 标签渲染以防止 XSS
    linkify: true,
    typographer: true,
    breaks: true,
    quotes: '""',
    headerIds: true,
    headerPrefix: 'md-header-',
    listIndent: 2,
    // 启用有序列表的连续编号
    ordered: true,
  });

  // 解析后的 HTML 内容
  const parsedContent = ref('');

  const currentFieldName = ref('');
  const questionContent = ref('');
  const parsedAnswerContent = ref('');

  base.onSelectionChange(async (event) => {
    // 获取点击的字段id和记录id
    currentFieldId.value = event.data.fieldId;
    recordId.value = event.data.recordId;

    // 获取当前数据表和视图
    databaseId.value = event.data.tableId;
    viewId.value = event.data.viewId;

    const table = await base.getActiveTable();
    if (currentFieldId.value && recordId.value) {
      // 更新最后一次选中的ID
      lastSelectedFieldId.value = currentFieldId.value;
      lastSelectedRecordId.value = recordId.value;

      try {
        if (previewMode.value === 'ai' && questionFieldId.value && answerFieldId.value) {
          // AI 问答模式：获取问题和回答内容
          const questionData = await table.getCellValue(questionFieldId.value, recordId.value);
          const answerData = await table.getCellValue(answerFieldId.value, recordId.value);

          questionContent.value =
            questionData?.map((item) => item.text.replace(/\n$/, '')).join('\n') || `❗︎${t('preview.no_data')}`;
          parsedAnswerContent.value = md.render(
            answerData?.map((item) => item.text.replace(/\n$/, '')).join('\n') || '',
          );
          currentValue.value = answerData?.map((item) => item.text.replace(/\n$/, '')).join('\n') || '';

          // 获取当前字段名称
          const field = await table.getFieldById(currentFieldId.value);
          const fieldMeta = await field.getMeta();
          currentFieldName.value = fieldMeta.name;

          // 更新当前行号
          const currentIndex = recordIds.value.findIndex((id) => id === recordId.value);
          if (currentIndex !== -1) {
            currentRecordIndex.value = currentIndex;
          }
        } else {
          // 普通预览模式
          // 获取字段名称
          const field = await table.getFieldById(currentFieldId.value);
          const fieldMeta = await field.getMeta();
          currentFieldName.value = fieldMeta.name;

          // 修改当前数据
          let data = await table.getCellValue(currentFieldId.value, recordId.value);
          if (data && data.length) {
            currentValue.value = data.map((item) => item.text.replace(/\n$/, '')).join('\n');
            // 解析 Markdown 内容
            parsedContent.value = md.render(currentValue.value || '');
          }

          // 更新当前行号
          const currentIndex = recordIds.value.findIndex((id) => id === recordId.value);
          if (currentIndex !== -1) {
            currentRecordIndex.value = currentIndex;
          }
        }
      } catch (error) {
        console.error('获取字段信息失败:', error);
        currentFieldName.value = '';
        currentValue.value = '';
        parsedContent.value = '';
      }
    } else if (!event.data.fieldId && !event.data.recordId) {
      // 失去焦点时不清空内容，保持当前状态
      // 更新最后一次选中的ID
      if (currentFieldId.value && recordId.value) {
        lastSelectedFieldId.value = currentFieldId.value;
        lastSelectedRecordId.value = recordId.value;
      }
      // 只更新记录 ID 列表
      await updateRecordIds();
      return;
    }

    // 更新记录ID列表
    await updateRecordIds();
  });

  // 获取字段名称
  async function getFieldName(fieldId) {
    if (!fieldId) return '';
    const table = await base.getActiveTable();
    const field = await table.getFieldById(fieldId);
    const fieldMeta = await field.getMeta();
    return fieldMeta.name || '';
  }

  // 监听问题字段变化
  watch(questionFieldId, async (newValue) => {
    questionFieldName.value = await getFieldName(newValue);
  });

  // 监听回答字段变化
  watch(answerFieldId, async (newValue) => {
    answerFieldName.value = await getFieldName(newValue);
  });
</script>

<template>
  <!-- 设置弹窗 -->
  <el-dialog
    v-model="settingDialogVisible"
    :title="$t('preview.setting.title')"
    width="95%"
    @close="closeSettingDialog"
  >
    <div class="setting-content">
      <el-button
        type="primary"
        class="join-group-button"
        @click="handleJoinGroup"
        style="margin-bottom: 10px"
      >
        <el-icon
          class="chat-icon"
          style="margin-right: 4px"
        >
          <ChatRound />
        </el-icon>
        {{ $t('preview.sponsor.join_group') }}
      </el-button>

      <el-button
        type="warning"
        class="join-group-button"
        @click="handleJoinUser"
        style="margin-bottom: 10px"
      >
        <el-icon
          class="chat-icon"
          style="margin-right: 4px"
          ><UserFilled
        /></el-icon>
        联系开发者
      </el-button>

      <div class="default-config-section">
        <div class="config-row">
          <div class="config-label">默认打开</div>
          <el-input
            v-model="defaultConfig"
            placeholder="请输入多维表格地址"
            class="config-input"
          >
            <template #append>
              <el-button
                type="primary"
                @click="handleGenerate"
                style="color: #2955e7; background-color: #eef5fe; border-color: #2955e790; border-radius: 2px"
                >生成</el-button
              >
            </template>
          </el-input>
        </div>
        <div
          class="button-group"
          v-show="newFormUrl"
        >
          <el-button
            type="primary"
            @click="handlePreview"
            plain
          >
            <el-icon
              size="18"
              style="margin-right: 5px"
              ><View
            /></el-icon>
            一键预览</el-button
          >
          <el-button
            type="primary"
            @click="handleCopy"
            plain
          >
            <el-icon
              size="18"
              style="margin-right: 5px"
              ><CopyDocument
            /></el-icon>
            复制地址</el-button
          >
        </div>
      </div>
    </div>
  </el-dialog>

  <div class="markdown-preview">
    <div class="mode-switch">
      <div class="preview-type-selector">
        <el-radio-group
          v-model="previewMode"
          size="small"
        >
          <el-radio-button label="normal">{{ $t('preview.mode.normal') }}</el-radio-button>
          <el-radio-button label="ai">{{ $t('preview.mode.ai') }}</el-radio-button>
        </el-radio-group>
      </div>

      <div class="header-buttons">
        <div>
          <el-button
            class="setting-button"
            @click="settingDialogVisible = true"
            style="padding: 0px 4px"
          >
            <el-icon size="18">
              <Setting />
            </el-icon>
          </el-button>
          <el-button
            type="primary"
            class="sponsor-button"
            @click="sponsorDialogVisible = true"
          >
            <el-icon
              class="heart-icon"
              style="margin-right: 4px"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"
                />
              </svg>
            </el-icon>
            <span style="color: #020"> {{ $t('preview.sponsor.me') }} </span>
          </el-button>
          <el-button
            type="primary"
            @click="followAuthor"
            class="follow-button"
            style="--el-button-bg-color: #f472b6; --el-button-border-color: #f472b6"
          >
            <el-icon style="margin-right: 4px"
              ><svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                class="w-6 h-6"
              >
                <path
                  fill-rule="evenodd"
                  d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                  clip-rule="evenodd"
                /></svg
            ></el-icon>
            {{ $t('preview.sponsor.follow') }}
          </el-button>
        </div>
      </div>
    </div>

    <div
      v-if="previewMode === 'ai'"
      class="field-selectors"
    >
      <div class="field-selector-group">
        <span class="field-label">{{ $t('preview.ai_chat.question_field') }}</span>
        <el-select
          v-model="questionFieldId"
          :placeholder="$t('preview.ai_chat.question_field_placeholder')"
          class="field-selector"
          style="min-width: 100px"
          filterable
        >
          <el-option
            v-for="field in fieldList.filter((field) => field.id !== answerFieldId)"
            :key="field.id"
            :label="field.name"
            :value="field.id"
          >
            <span style="display: flex; align-items: center; gap: 4px">
              <span style="font-family: monospace; font-size: 12px; color: #8f959e">
                {{ field.type === 1 ? 'A=' : 'ƒx' }}
              </span>
              {{ field.name }}
            </span>
          </el-option>
        </el-select>
      </div>
      <div class="field-selector-group">
        <span class="field-label">{{ $t('preview.ai_chat.answer_field') }}</span>
        <el-select
          v-model="answerFieldId"
          :placeholder="$t('preview.ai_chat.answer_field_placeholder')"
          class="field-selector"
          style="min-width: 100px"
          filterable
        >
          <el-option
            v-for="field in fieldList.filter((field) => field.id !== questionFieldId)"
            :key="field.id"
            :label="field.name"
            :value="field.id"
          >
            <span style="display: flex; align-items: center; gap: 4px">
              <span style="font-family: monospace; font-size: 12px; color: #8f959e">
                {{ field.type === 1 ? 'A=' : 'fx' }}
              </span>
              {{ field.name }}
            </span>
          </el-option>
        </el-select>
      </div>
    </div>
    <div
      class="header-container"
      v-if="currentRecordIndex >= 0"
    >
      <div class="header-content">
        <div style="background-color: #f5f7fa">
          <div
            class="cell-info"
            style="display: flex; justify-content: flex-start"
          >
            <div class="field-navigation-buttons">
              <el-button
                @click="switchField('prev')"
                size="small"
                style="padding: 2px; height: 16px"
                :title="$t('preview.navigation.prev_field')"
                :disabled="
                  !fieldList || !currentFieldId || fieldList.findIndex((field) => field.id === currentFieldId) <= 0
                "
              >
                <el-icon style="font-size: 12px"><ArrowLeft /></el-icon>
              </el-button>
              <el-button
                type="primary"
                @click="switchField('next')"
                size="small"
                style="
                  padding: 2px;
                  height: 16px;
                  --el-button-bg-color: #2955e7;
                  --el-button-border-color: #2955e7;
                  margin-left: 6px;
                "
                :title="$t('preview.navigation.next_field')"
                :disabled="
                  !fieldList ||
                  !currentFieldId ||
                  fieldList.findIndex((field) => field.id === currentFieldId) === fieldList.length - 1
                "
              >
                <el-icon style="font-size: 12px"><ArrowRight /></el-icon>
              </el-button>
            </div>
            <div style="display: flex; justify-content: space-between; width: 100%">
              <div>
                <span
                  style="
                    display: inline-block;
                    max-width: 300px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    vertical-align: bottom;
                  "
                  :title="currentFieldName"
                  >{{ $t('preview.current_field') }}：<strong style="color: #2955e7">{{
                    currentFieldName
                  }}</strong></span
                >
              </div>
              <div>
                <span
                  >{{ $t('preview.current_row') }}：<strong style="color: #2955e7">{{
                    currentRecordIndex + 1
                  }}</strong></span
                >
              </div>
            </div>
          </div>
        </div>
        <div class="navigation-buttons">
          <el-button @click="switchRecord('prev')">
            <el-icon size="16px; font-weight: bold"><ArrowLeft /></el-icon>
            <span class="material-icons">{{ $t('preview.navigation.prev') }}</span>
          </el-button>
          <el-button
            type="primary"
            @click="switchRecord('next')"
            style="--el-button-bg-color: #2955e7; --el-button-border-color: #2955e7"
          >
            <span class="material-icons">{{ $t('preview.navigation.next') }}</span>
            <el-icon size="16px; font-weight: bold"><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>
    </div>
    <div v-if="currentRecordIndex >= 0">
      <div
        v-if="previewMode === 'normal'"
        class="cell-preview split-view"
        @scroll="handleScroll"
      >
        <div class="preview-header">
          <div class="preview-actions">
            <el-button
              @click="toggleEditing"
              plain
              size="small"
              style="padding: 6px 4px"
            >
              <el-icon
                :class="['edit-button', isEditing ? 'editing' : '']"
                :title="isEditing ? $t('preview.edit.exit') : $t('preview.edit.button')"
                size="20"
                ><Edit
              /></el-icon>
            </el-button>
            <el-button
              v-if="currentValue"
              @click="copyContent"
              plain
              size="small"
              style="padding: 6px 4px"
            >
              <el-icon
                class="copy-button"
                :title="$t('preview.copy.button')"
                size="20"
                ><DocumentCopy
              /></el-icon>
            </el-button>
            <!-- FIXME 暂时不做 导出图片 ,1-2-3 高亮的样式有点问题-->
            <el-button
              v-if="currentValue"
              @click="downloadAsImage"
              plain
              size="small"
              style="padding: 6px 4px"
            >
              <el-icon
                class="copy-button"
                size="20"
                :title="$t('preview.downloadImage.button')"
                ><Download
              /></el-icon>
            </el-button>
          </div>
        </div>
        <el-button
          v-show="showBackToTop"
          size="small"
          type="primary"
          class="back-to-top-button"
          @click="scrollToTop"
        >
          <el-icon size="16"><ArrowUp /></el-icon>
        </el-button>
        <div class="split-container">
          <template v-if="isEditing">
            <div class="editor-pane">
              <textarea
                class="markdown-editor"
                v-model="currentValue"
                @input="handleInput"
                @keydown="handleKeyDown"
              ></textarea>
            </div>
            <div class="preview-pane">
              <div
                class="preview-content"
                v-html="parsedContent"
              ></div>
            </div>
          </template>
          <template v-else>
            <div class="preview-pane full-width">
              <div
                class="preview-content"
                v-html="parsedContent"
              ></div>
            </div>
          </template>
        </div>
      </div>
      <div
        v-else
        class="preview-content ai-chat"
      >
        <div
          class="question-content"
          :title="questionContent"
        >
          <div class="ai-info">
            <div>
              <el-button
                v-if="questionContent"
                @click="copyQuestionContent"
                plain
                size="small"
                style="padding: 6px 4px"
              >
                <el-icon
                  class="copy-button"
                  :title="$t('preview.copy.button')"
                  size="20"
                  ><DocumentCopy
                /></el-icon>
              </el-button>
            </div>
            <span class="tag question-tag">{{ $t('preview.question') }}</span>
          </div>
          <p>{{ questionContent }}</p>
        </div>
        <div
          class="answer-content"
          @scroll="handleAnswerScroll"
        >
          <div class="ai-info">
            <el-button
              v-if="parsedAnswerContent"
              plain
              size="small"
              style="padding: 6px 4px"
              @click="copyAnswerContent"
            >
              <el-icon
                class="copy-button"
                size="20"
                :title="$t('preview.copy.button')"
                ><DocumentCopy
              /></el-icon>
            </el-button>

            <span class="tag answer-tag">{{ $t('preview.answer') }}</span>
          </div>
          <el-button
            v-show="showBackToTopAnswer"
            size="small"
            type="primary"
            class="back-to-top-button"
            @click="scrollAnswerToTop"
          >
            <el-icon size="16"><ArrowUp /></el-icon>
          </el-button>
          <div v-html="parsedAnswerContent"></div>
        </div>
      </div>
    </div>
    <div
      v-else
      class="empty-state"
    >
      <div class="empty-message">
        {{ $t('preview.empty_state') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
  .split-view {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .split-container {
    display: flex;
    flex: 1;
    overflow: hidden;
    height: calc(100% - 40px);
    border-top: 1px solid #e5e6eb;
    margin-top: 8px;
  }

  .editor-pane {
    flex: 1;
    overflow: auto;
    border-right: 1px solid #e5e6eb;
    padding-right: 8px;
  }

  .preview-pane {
    flex: 1;
    overflow: auto;
    padding-left: 8px;
  }
  .default-config-section {
    margin-top: 10px;
  }
  .config-label {
    margin-bottom: 10px;
    font-size: 14px;
  }
  .config-input {
    margin-bottom: 10px;
  }
  .button-group {
    display: flex;
    gap: 10px;
  }
  .config-row {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
  }

  .config-label {
    white-space: nowrap;
    margin-right: 8px;
  }

  .config-input {
    flex: 1;
    margin-right: 8px;
  }

  .generate-button {
    white-space: nowrap;
  }
  .header-buttons {
    margin-bottom: 0.5rem;
    /* display: flex; */
  }

  .sponsor-content {
    text-align: center;
  }

  .sponsor-content p {
    margin-bottom: 1rem;
  }

  .qr-placeholder {
    margin: 1rem auto;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #909399;

    img {
      width: 175px;
      height: 185px;

      &:first-child {
        margin-right: 30px;
      }
    }
  }

  .empty-message {
    font-size: 1.1em;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
  }

  .empty-message::before {
    content: '';
    display: inline-block;
    width: 22px;
    height: 22px;
    background-image: url('data:image/svg+xml;utf8,<svg t="1708589468695" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4120"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z m32 664c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V456c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272z m-32-344c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48z" fill="%2386909C" p-id="4121"></path></svg>');
    background-size: contain;
    background-repeat: no-repeat;
  }

  .markdown-preview {
    font-weight: 400;
    padding: 4px;
    height: 98vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .mode-switch {
    display: flex;
    justify-content: space-between;

    :deep(.el-radio-button__inner) {
      &:hover {
        color: #2955e7;
      }
    }

    :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
      background-color: #2955e7 !important;
      border-color: #2955e7 !important;
      box-shadow: -1px 0 0 0 #2955e7 !important;
    }
  }

  .cell-info {
    display: flex;
    align-items: center;
    padding: 8px;
    padding-top: 4px;
    background-color: #f5f7fa;
    border-radius: 4px;
    margin-bottom: 4px;
    font-size: 14px;
    color: #1f2329;
    font-weight: 600;
  }

  .field-navigation-buttons {
    display: flex;
    margin-right: 6px;
    /* margin-left: 16px; */
  }

  .navigation-buttons {
    margin-top: 4px;
  }

  .cell-preview {
    border: 1px solid #e5e6eb;
    border-radius: 4px;
    padding: 4px;
    margin-top: 6px;
    flex: 1;
    overflow-y: auto;
    min-height: 50px;
    scroll-behavior: smooth;
    max-height: 81vh;

    scroll-behavior: smooth;
  }

  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
  }

  .preview-content {
    line-height: 1.6;
    color: #1f2329;
  }

  .preview-content :deep(h1),
  .preview-content :deep(h2),
  .preview-content :deep(h3),
  .preview-content :deep(h4),
  .preview-content :deep(h5),
  .preview-content :deep(h6) {
    margin: 0.4em 0 0.4em;
    line-height: 1.4;
    font-weight: 600;
  }

  .preview-content :deep(h1) {
    font-size: 2em;
    margin-top: 0.6em;
  }

  .preview-content :deep(h2) {
    font-size: 1.5em;
  }

  .preview-content :deep(h3) {
    font-size: 1.25em;
  }

  .preview-content :deep(h4) {
    font-size: 1.1em;
  }

  .preview-content :deep(h5) {
    font-size: 1em;
  }

  .preview-content :deep(h6) {
    font-size: 0.9em;
  }

  .preview-content :deep(ul),
  .preview-content :deep(ol) {
    padding-left: 1.2em;
    margin: 0.6em 0;
    list-style-position: outside;
  }

  .preview-content :deep(ul) {
    list-style-type: disc;
  }

  .preview-content :deep(ol) {
    list-style-type: decimal;
  }

  .preview-content :deep(li) {
    margin: 0.5em 0;
    line-height: 1.6;
  }

  .preview-content :deep(strong),
  .preview-content :deep(b) {
    font-weight: 600;
  }

  .preview-content :deep(em),
  .preview-content :deep(i) {
    font-style: italic;
  }

  .preview-content :deep(code) {
    font-family: Menlo, Monaco, Consolas, 'Courier New', monospace;
    background-color: #f5f7fa;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-size: 0.9em;
    color: #476582;
  }

  .preview-content :deep(pre) {
    background-color: #f5f7fa;
    padding: 1em;
    border-radius: 5px;
    overflow-x: auto;
    line-height: 1.5;
  }

  .preview-content :deep(pre code) {
    background-color: transparent;
    padding: 0;
    border-radius: 0;
    color: inherit;
  }

  .preview-content :deep(blockquote) {
    border-left: 4px solid #e5e6eb;
    margin: 1em 0;
    padding: 0.5em 0 0.5em 1em;
    color: #666;
    background-color: #f9f9f9;
  }

  .preview-content :deep(p) {
    margin: 0.6em 0;
    line-height: 1.6;
  }

  .markdown-editor {
    width: 100%;
    height: 100%;
    min-height: 520px;
    border: none;
    outline: none;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.6;
    padding: 8px;
    resize: none;
    overflow-y: auto;
    overflow-x: hidden !important;
  }

  .preview-header {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    justify-content: flex-end;
    /* padding: 8px; */
  }

  .preview-actions {
    display: flex;
    gap: 8px;
  }

  .edit-button,
  .copy-button {
    cursor: pointer;
    color: #646a73;
  }

  .edit-button:hover,
  .copy-button:hover {
    color: #3370ff;
  }
  .edit-button.editing {
    color: #2955e7;
  }
</style>

<style>
  .selectStyle {
    .el-select-dropdown__item {
      font-weight: 300 !important;
    }

    .el-select-dropdown__item.selected {
      color: rgb(20, 86, 240);
    }
  }
  .field-selectors {
    /* display: flex; */
    /* gap: 8px; */
    /* margin-top: 8px; */
  }

  .field-selector-group {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
  }

  .field-label {
    color: #1f2329;
    font-size: 14px;
    white-space: nowrap;
  }

  .field-selector {
    width: 320px;
  }

  .follow-button {
    width: 75px;
    margin-left: 0 !important;
    transition: transform 0.2s ease;
    background-color: #f472b6 !important;
    border-color: #f472b6 !important;
  }

  .follow-button:hover {
    transform: scale(1.1);
    background-color: #f472b6 !important;
    border-color: #f472b6 !important;
  }

  .setting-button {
    margin-right: 4px;
    font-size: 13px;
    transition: transform 0.2s ease;
    color: #646a73;
  }

  .setting-button:hover {
    transform: scale(1.1);
    color: #3370ff !important;
  }

  .sponsor-button {
    width: 75px;
    margin-right: 4px;
    margin-left: 0 !important;
    color: #ec5f59 !important;
    transition: transform 0.2s ease;
    background: linear-gradient(to right, #ffd75e, #ffcd38) !important;
    border-color: #f8d76e !important;
  }

  .sponsor-button:hover {
    transform: scale(1.1);
    background: linear-gradient(to right, #ffd75e, #ffcd38) !important;
    border-color: #f8d76e !important;
  }

  @keyframes heartbeat {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2);
    }
    100% {
      transform: scale(1);
    }
  }

  .heart-icon {
    animation: heartbeat 1s infinite;
    transform-origin: center;
    display: inline-flex;
  }

  .back-to-top-button {
    position: fixed;
    bottom: 60px;
    right: 30px;
    width: 45px;
    height: 35px;
    border-radius: 50%;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
    background-color: #2955e7 !important;
    border-color: #2955e7 !important;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    z-index: 1000;
  }

  .back-to-top-button:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.2);
  }

  .ai-chat {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .question-content,
  .answer-content {
    padding: 16px;
    padding-top: 8px;
    border-radius: 8px;
    position: relative;
    overflow-y: auto;
    margin-top: 6px;
    scroll-behavior: smooth;
    min-height: 30px;
  }

  .tag {
    position: absolute;
    top: 0px;
    left: 16px;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    border: 1px solid;
    margin: 0;
  }

  .question-tag {
    background-color: #f2f3f5;
    color: #1f2329;
    border-color: #e5e6eb;
  }

  .answer-tag {
    background-color: #e8f3ff;
    color: #2955e7;
    border-color: #bedaff;
  }

  .question-content {
    background-color: #f5f6f7;
    font-size: 14px;
    max-height: 50px;
  }

  .answer-content {
    /* background-color: #f0f7ff; */
    background-color: #fff;
    border: 1px solid #e5e6eb;
    max-height: 55vh;
  }

  .ai-info {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    justify-content: flex-end;
    height: 22px;
  }

  .question-content p {
    margin: 0;
    color: #4e5969;
    line-height: 1.6;
    white-space: pre-wrap;
  }
</style>
