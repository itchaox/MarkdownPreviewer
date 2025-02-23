<!--
 * @Version    : v1.00
 * @Author     : itchaox
 * @Date       : 2023-09-26 15:10
 * @LastAuthor : Wang Chao
 * @LastTime   : 2025-02-23 13:50
 * @desc       : Markdown 预览插件
-->
<script setup>
  import { onMounted, watch, ref, watchEffect } from 'vue';
  import { bitable } from '@lark-base-open/js-sdk';

  import opencc from 'node-opencc';
  import { ElMessage, ElButton, ElDialog } from 'element-plus';
  import { ArrowLeft, ArrowRight, DocumentCopy } from '@element-plus/icons-vue';
  import MarkdownIt from 'markdown-it';

  import { useI18n } from 'vue-i18n';
  const { t } = useI18n();

  // 赞助我弹窗控制
  const sponsorDialogVisible = ref(false);

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

  // 当前点击字段id
  const currentFieldId = ref();
  const recordId = ref();

  const currentValue = ref();
  const currentRecordIndex = ref(0);
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
      // 只展示文本相关字段
      fieldList.value = _list.filter((item) => item.type === 1);
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
    if (!currentFieldId.value || recordIds.value.length === 0) return;

    const currentIndex = recordIds.value.findIndex((id) => id === recordId.value);
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

      questionContent.value = questionData?.[0]?.text || '';
      parsedAnswerContent.value = md.render(answerData?.[0]?.text || '');
    } else {
      // 普通预览模式
      const data = await table.getCellValue(currentFieldId.value, recordId.value);
      if (data && data[0]) {
        currentValue.value = data[0].text;
        parsedContent.value = md.render(data[0].text || '');
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

    // 只展示文本相关字段
    fieldList.value = _list.filter((item) => item.type === 1);
  });

  // 监听问答字段变化
  watch([questionFieldId, answerFieldId], async () => {
    if (previewMode.value === 'ai' && questionFieldId.value && answerFieldId.value && recordId.value) {
      const table = await base.getActiveTable();
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

  // 初始化 markdown-it
  const md = new MarkdownIt({
    html: true,
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
      try {
        if (previewMode.value === 'ai' && questionFieldId.value && answerFieldId.value) {
          // AI 问答模式：获取问题和回答内容
          const questionData = await table.getCellValue(questionFieldId.value, recordId.value);
          const answerData = await table.getCellValue(answerFieldId.value, recordId.value);

          questionContent.value = questionData?.[0]?.text || '';
          parsedAnswerContent.value = md.render(answerData?.[0]?.text || '');
          currentValue.value = answerData?.[0]?.text || '';

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
          if (data && data[0] && data[0].text !== currentValue.value) {
            currentValue.value = data[0].text;
            // 解析 Markdown 内容
            parsedContent.value = md.render(data[0].text || '');
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
    } else {
      currentFieldName.value = '';
      currentValue.value = '';
      parsedContent.value = '';
    }

    // 更新记录ID列表
    await updateRecordIds();
  });

  async function getAllRecordIdList(_pageToken = 0) {
    const table = await bitable.base.getTable(databaseId.value);
    const data = await table.getRecordIdListByPage({ pageSize: 200, pageToken: _pageToken }); // 获取所有记录 id
    const { total, hasMore, recordIds: recordIdsData, pageToken } = data;
    recordIds.value.push(...recordIdsData);
    if (hasMore) {
      await getAllRecordIdList(pageToken);
    }
  }

  const recordList = [];
  async function getAllRecordList(_pageToken = 0) {
    const table = await bitable.base.getTable(databaseId.value);
    const data = await table.getRecordListByPage({ pageSize: 200, pageToken: _pageToken });
    const { total, hasMore, records: recordsData, pageToken } = data;
    recordList.push(...recordsData);

    if (hasMore) {
      await getAllRecordList(pageToken);
    }
  }

  function getNewValue(value) {
    let newValue;
    if (target.value === 's') {
      // 简体
      newValue = opencc.taiwanToSimplifiedWithPhrases(value);
    } else {
      // 繁体

      switch (traditionalModel.value) {
        case '1':
          // 正体繁体
          newValue = opencc.simplifiedToTraditional(value);
          break;
        case '2':
          // 台湾繁体
          if (localModel.value === '1') {
            newValue = opencc.simplifiedToTaiwan(value);
          } else {
            // 台湾地域
            newValue = opencc.simplifiedToTaiwanWithPhrases(value);
          }
          break;
        default:
          // 香港繁体
          newValue = opencc.simplifiedToHongKong(value);
      }
    }

    return newValue;
  }

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
  <el-dialog
    v-model="sponsorDialogVisible"
    title="💗赞助我"
    width="95%"
  >
    <div class="sponsor-content">
      <p>{{ $t('preview.sponsor.tip1') }} ☕️</p>
      <p>{{ $t('preview.sponsor.tip2') }}️</p>
      <p>{{ $t('preview.sponsor.tip3') }}️</p>
      <div class="qr-placeholder">
        <img
          src="@/assets/wx.png"
          alt=""
        />
        <img
          src="@/assets/zfb.png"
          alt=""
        />
      </div>
    </div>
  </el-dialog>

  <div class="markdown-preview">
    <div class="mode-switch">
      <el-radio-group
        v-model="previewMode"
        size="small"
      >
        <el-radio-button label="normal">{{ $t('preview.mode.normal') }}</el-radio-button>
        <el-radio-button label="ai">{{ $t('preview.mode.ai') }}</el-radio-button>
      </el-radio-group>

      <div class="header-buttons">
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
        >
          <el-option
            v-for="field in fieldList.filter((field) => field.id !== answerFieldId)"
            :key="field.id"
            :label="field.name"
            :value="field.id"
          />
        </el-select>
      </div>
      <div class="field-selector-group">
        <span class="field-label">{{ $t('preview.ai_chat.answer_field') }}</span>
        <el-select
          v-model="answerFieldId"
          :placeholder="$t('preview.ai_chat.answer_field_placeholder')"
          class="field-selector"
          style="min-width: 100px"
        >
          <el-option
            v-for="field in fieldList.filter((field) => field.id !== questionFieldId)"
            :key="field.id"
            :label="field.name"
            :value="field.id"
          />
        </el-select>
      </div>
    </div>
    <div
      class="header-container"
      v-if="currentValue"
    >
      <div class="header-content">
        <div class="cell-info">
          <span
            >{{ $t('preview.current_field') }}：<strong style="color: #2955e7">{{ currentFieldName }}</strong></span
          >
          <span
            >{{ $t('preview.current_row') }}：<strong style="color: #2955e7">{{ currentRecordIndex + 1 }}</strong></span
          >
        </div>
        <div class="navigation-buttons">
          <el-button
            @click="switchRecord('prev')"
            :disabled="!currentValue"
          >
            <el-icon style="font-size: 16px; font-weight: bold"><ArrowLeft /></el-icon>
            <span class="material-icons">{{ $t('preview.navigation.prev') }}</span>
          </el-button>
          <el-button
            type="primary"
            @click="switchRecord('next')"
            :disabled="!currentValue"
            style="--el-button-bg-color: #2955e7; --el-button-border-color: #2955e7"
          >
            <span class="material-icons">{{ $t('preview.navigation.next') }}</span>
            <el-icon style="font-size: 16px; font-weight: bold"><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>
    </div>
    <div v-if="currentValue">
      <div
        class="cell-preview"
        v-if="previewMode === 'normal'"
      >
        <div class="preview-header">
          <el-button
            size="small"
            @click="copyContent"
            type="primary"
            plain
            class="copy-button"
          >
            <el-icon style="margin-right: 4px"><DocumentCopy /></el-icon>
            {{ $t('preview.copy.button') }}
          </el-button>
        </div>
        <div
          class="preview-content"
          v-html="parsedContent"
        ></div>
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
            <el-button
              v-if="questionContent"
              size="small"
              @click="copyQuestionContent"
              type="primary"
              plain
              class="copy-button"
            >
              <el-icon style="margin-right: 4px"><DocumentCopy /></el-icon>
              {{ $t('preview.copy.button') }}
            </el-button>

            <span class="tag question-tag">{{ $t('preview.question') }}</span>
          </div>
          <p>{{ questionContent }}</p>
        </div>
        <div class="answer-content">
          <div class="ai-info">
            <el-button
              v-if="parsedAnswerContent"
              size="small"
              @click="copyAnswerContent"
              type="primary"
              plain
              class="copy-button"
            >
              <el-icon style="margin-right: 4px"><DocumentCopy /></el-icon>
              {{ $t('preview.copy.button') }}
            </el-button>
            <span class="tag answer-tag">{{ $t('preview.answer') }}</span>
          </div>
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
  .header-buttons {
    margin-bottom: 0.5rem;
    display: flex;
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
      width: 180px;
      height: 180px;

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
    height: 96vh;
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
    justify-content: space-between;
    padding: 8px;
    background-color: #f5f7fa;
    border-radius: 4px;
    margin-bottom: 4px;
    font-size: 14px;
    color: #1f2329;
    font-weight: 600;
  }

  .navigation-buttons {
    margin: 6px 0;
  }

  .cell-preview {
    border: 1px solid #e5e6eb;
    border-radius: 4px;
    padding: 8px 12px;
    margin-top: 6px;
    flex: 1;
    overflow-y: auto;
    min-height: 50px;
    scroll-behavior: smooth;
    max-height: 75vh;
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

  .preview-header {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    justify-content: flex-end;
  }

  .copy-button {
    display: flex;
    align-items: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
  }

  .copy-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
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
    margin-top: 8px;
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
    max-height: 6vh;
    font-size: 14px;
  }

  .answer-content {
    /* background-color: #f0f7ff; */
    background-color: #fff;
    max-height: 50vh;
    border: 1px solid #e5e6eb;
  }

  .ai-info {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    justify-content: flex-end;
  }

  .question-content p {
    margin: 0;
    color: #4e5969;
    line-height: 1.6;
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
    margin-top: 8px;
  }

  .field-selector-group {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
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
    width: 85px;
    transition: transform 0.2s ease;
    background-color: #f472b6 !important;
    border-color: #f472b6 !important;
  }

  .follow-button:hover {
    transform: scale(1.1);
    background-color: #f472b6 !important;
    border-color: #f472b6 !important;
  }

  .sponsor-button {
    width: 90px;
    margin-right: -5px;
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
</style>
