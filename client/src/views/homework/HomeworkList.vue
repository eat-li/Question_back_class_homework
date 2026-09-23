<template>
  <el-card>
    <div class="toolbar">
      <el-button type="primary" :icon="Plus" @click="openCreate">发布作业</el-button>
      <el-button
        v-if="selectedIds.length"
        type="danger"
        plain
        :icon="Delete"
        :loading="bulkDeleting"
        @click="bulkRemove"
        >批量删除（{{ selectedIds.length }}）</el-button
      >
      <el-button v-if="selectedIds.length" text @click="clearSelection">清空选择</el-button>
      <span v-if="selectedIds.length" class="picked-count">已选 {{ selectedIds.length }} 个作业</span>
    </div>

    <el-table
      ref="tableRef"
      :data="list"
      border
      stripe
      row-key="id"
      v-loading="loading"
      @selection-change="onSelectionChange"
    >
      <el-table-column type="selection" width="46" reserve-selection />
      <el-table-column prop="title" label="作业标题" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small">{{
            statusLabel(row.status)
          }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="题目数" width="90">
        <template #default="{ row }">{{ (row.questionIds || []).length }}</template>
      </el-table-column>
      <el-table-column label="截止时间" width="180">
        <template #default="{ row }">
          <span :class="{ 'end-at--expired': isExpired(row.endAt) }">{{
            formatDateTime(row.endAt)
          }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="490">
        <template #default="{ row }">
          <el-button size="small" :icon="EditPen" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" :icon="Notebook" @click="openSummary(row)">课时总结</el-button>
          <el-button size="small" :icon="Edit" @click="openScore(row)">打分</el-button>
          <el-button size="small" type="primary" :icon="Download" @click="openExport(row)"
            >导出 PDF</el-button
          >
          <el-button size="small" type="danger" :icon="Delete" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > pageSize" class="pager">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next, total"
        background
        @current-change="load"
      />
    </div>
  </el-card>

  <!-- 发布 / 编辑作业 -->
  <el-dialog v-model="createVisible" :title="editingId ? '编辑作业' : '发布作业'" width="560px">
    <el-form :model="form" label-width="80px">
      <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
      <el-form-item label="选择题目">
        <div class="question-picker">
          <el-radio-group v-model="pickMode" size="small" @change="onModeChange">
            <el-radio-button value="multi">多选</el-radio-button>
            <el-radio-button value="single">单选</el-radio-button>
          </el-radio-group>
          <el-button size="small" type="primary" @click="openPicker">抽题</el-button>
          <el-button size="small" :disabled="!(form.questionIds || []).length" @click="openSelected"
            >查看 / 排序</el-button
          >
          <span class="picked-count">已选 {{ (form.questionIds || []).length }} 题</span>
        </div>
      </el-form-item>
      <el-form-item label="选择学生">
        <div class="question-picker">
          <el-button size="small" type="primary" @click="openStudentPicker">选择学生</el-button>
          <span class="picked-count">已选 {{ (form.studentIds || []).length }} 名学生</span>
        </div>
      </el-form-item>
      <el-form-item label="截止时间">
        <el-date-picker v-model="form.endAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" />
      </el-form-item>
      <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
      <el-form-item v-if="editingId" label="状态">
        <el-radio-group v-model="form.status">
          <el-radio-button value="draft">草稿</el-radio-button>
          <el-radio-button value="published">已发布</el-radio-button>
          <el-radio-button value="closed">已截止</el-radio-button>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <el-alert
      v-if="editingId"
      type="info"
      :closable="false"
      show-icon
      title="修改会同步到该作业关联的题目与学生；已录入的成绩不受影响。"
      style="margin-top: 4px"
    />
    <template #footer>
      <el-button @click="createVisible = false">取消</el-button>
      <el-button type="primary" @click="save">{{ editingId ? '保存修改' : '发布' }}</el-button>
    </template>
  </el-dialog>

  <!-- 抽题框 -->
  <el-drawer v-model="drawerVisible" title="抽题" size="84%">
    <div class="picker-toolbar">
      <el-input
        v-model="qKeyword"
        placeholder="按题干搜索"
        clearable
        style="width: 220px"
        @keyup.enter="qSearch"
      />
      <el-select
        v-model="qType"
        placeholder="题型"
        clearable
        style="width: 130px"
        @change="qSearch"
      >
        <el-option label="选择题" value="choice" />
        <el-option label="填空题" value="fill" />
        <el-option label="解答题" value="solve" />
      </el-select>
      <el-select
        v-model="qKnowledgeTag"
        placeholder="知识点"
        clearable
        filterable
        style="width: 140px"
        @change="onPrimaryKnowledgeChange"
      >
        <el-option v-for="t in qKnowledgeOptions" :key="t" :label="t" :value="t" />
      </el-select>
      <el-select
        v-model="qKnowledgeSubTag"
        placeholder="二级知识点"
        clearable
        filterable
        style="width: 140px"
        :disabled="!qKnowledgeTag"
        @change="qSearch"
      >
        <el-option v-for="t in qSubKnowledgeOptions" :key="t" :label="t" :value="t" />
      </el-select>
      <el-button type="primary" @click="qSearch">查询</el-button>
      <el-checkbox v-model="pickerFull">完整题目</el-checkbox>
      <span class="picker-hint"
        >点击整行即可选中 / 取消；题干过长时可关闭「完整题目」，图片可点击放大</span
      >
      <span class="picked-count">已选 {{ pickedIds.length }} 题</span>
      <el-button v-if="pickedIds.length" size="small" @click="clearPicked">清空已选</el-button>
    </div>

    <el-table
      :data="questions"
      border
      stripe
      v-loading="qLoading"
      @row-click="onRowClick"
      :row-class-name="rowClassName"
    >
      <el-table-column label="选择" width="70">
        <template #default="{ row }">
          <el-checkbox
            v-if="pickMode === 'multi'"
            class="pick-check"
            :model-value="isPicked(row.id)"
            @click.stop
            @change="(v: boolean) => togglePick(row.id, v)"
          />
          <el-radio
            v-else
            class="pick-check"
            :model-value="pickedIds[0]"
            :value="row.id"
            @click.stop
            @change="() => pickSingle(row.id)"
          />
        </template>
      </el-table-column>
      <el-table-column label="题目" min-width="360">
        <template #default="{ row }">
          <div class="q-cell" :class="{ 'is-compact': !pickerFull }" @click="onQuestionCellClick">
            <RichContent class="q-cell-preview" :html="row.title || ''" />
            <template v-if="pickerFull">
              <div v-if="optionTexts(row).length" class="q-cell-options">
                <div v-for="(opt, oi) in optionTexts(row)" :key="oi" class="q-cell-option">
                  {{ String.fromCharCode(65 + oi) }}. {{ opt }}
                </div>
              </div>
              <RichContent v-if="row.body" class="q-cell-body" :html="row.body" />
            </template>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="题型" width="90">
        <template #default="{ row }">{{ typeLabel(row.type) }}</template>
      </el-table-column>
      <el-table-column prop="difficulty" label="难度" width="70" />
      <el-table-column label="知识点" width="170">
        <template #default="{ row }">
          {{ row.knowledgeTag || '—' }}{{ row.knowledgeSubTag ? ' › ' + row.knowledgeSubTag : '' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button size="small" link type="primary" @click.stop="showDetail(row)"
            >查看详情</el-button
          >
        </template>
      </el-table-column>
    </el-table>

    <div v-if="qTotal > qPageSize" class="pager">
      <el-pagination
        v-model:current-page="qPage"
        :page-size="qPageSize"
        :total="qTotal"
        layout="prev, pager, next, total"
        background
        @current-change="loadQuestions"
      />
    </div>

    <template #footer>
      <el-button @click="drawerVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmPick">确定</el-button>
    </template>
  </el-drawer>

  <!-- 已选题目：查看与手动排序 -->
  <el-dialog
    v-model="selectedVisible"
    title="已选题目（点击两题即可互换顺序）"
    width="92%"
    style="max-width: 1240px"
    top="4vh"
  >
    <div class="sel-hint">
      <template v-if="swapIndex === null">
        直接改左侧<b>题号</b>并回车，即可把该题移到指定位置（其余题目自动让位）；也可拖动 ⠿
        或用「上移/下移」微调，或点击两题<b>互换位置</b>。点「查看整题」可展开完整题目。
      </template>
      <template v-else>
        已选中第 <b>{{ swapIndex + 1 }}</b> 题 —— 再点另一题交换位置，点自己或点「取消选中」放弃。
        <el-button link type="primary" size="small" @click="swapIndex = null">取消选中</el-button>
      </template>
    </div>
    <div v-loading="selectedLoading" class="sel-wrap">
      <el-empty v-if="!selectedLoading && !selectedList.length" description="还没有选择题目" />
      <TransitionGroup name="sel" tag="div" class="sel-list">
        <div
          v-for="(q, i) in selectedList"
          :key="q.id"
          :data-id="q.id"
          class="sel-row"
          :class="{
            'is-dragging': dragIndex === i,
            'is-picked': swapIndex === i,
            'is-flash': flashId === q.id
          }"
        :title="
          swapIndex === null ? '点击选中该题，再点另一题即可交换顺序' : '点击与选中题目交换位置'
        "
        @click="onSelRowClick(i)"
        @dragover.prevent="onSelDragOver(i)"
        @drop.prevent="onSelDrop"
      >
        <!-- 题号可直接改：输入目标位置后回车，本题就移到那里，其余题目依次让位 -->
        <input
          class="sel-no"
          :class="{ 'is-picked': swapIndex === i }"
          type="text"
          inputmode="numeric"
          :value="i + 1"
          :title="`当前第 ${i + 1} 题；改成目标题号并回车，可直接移到该位置`"
          @click.stop
          @keydown.enter.stop.prevent="onGoto(q.id, $event)"
          @keydown.esc.stop="onGotoEsc(i, $event)"
          @blur="onGoto(q.id, $event)"
        />
        <span
          class="sel-handle"
          draggable="true"
          title="按住拖动调整顺序"
          @click.stop
          @dragstart="onSelDragStart(i)"
          @dragend="onSelDragEnd"
          >⠿</span
        >
        <div class="sel-main" @click="onQuestionCellClick">
          <RichContent
            class="sel-title"
            :class="{ 'is-full': isSelectedFull(q.id) }"
            :html="q.title || ''"
          />
          <template v-if="isSelectedFull(q.id)">
            <div v-if="optionTexts(q).length" class="q-cell-options">
              <div v-for="(opt, oi) in optionTexts(q)" :key="oi" class="q-cell-option">
                {{ String.fromCharCode(65 + oi) }}. {{ opt }}
              </div>
            </div>
            <RichContent v-if="q.body" class="q-cell-body" :html="q.body" />
          </template>
          <div class="sel-tags">
            <el-tag size="small" type="info">{{ typeLabel(q.type) }}</el-tag>
            <el-tag size="small" type="warning">{{ '★'.repeat(q.difficulty || 0) || '—' }}</el-tag>
            <el-tag v-if="q.knowledgeTag" size="small"
              >{{ q.knowledgeTag }}{{ q.knowledgeSubTag ? ' › ' + q.knowledgeSubTag : '' }}</el-tag
            >
          </div>
        </div>
        <div class="sel-actions">
          <el-button size="small" text @click.stop="toggleSelectedFull(q.id)">
            {{ isSelectedFull(q.id) ? '收起' : '查看整题' }}
          </el-button>
          <!-- 这道题还没有解析时，可以直接让 AI 补一份（有解析就不会出现） -->
          <AiAnswerButton :question="q" @generated="(html: string) => (q.answer = html)" />
          <el-button size="small" text :disabled="i === 0" @click.stop="moveSelected(i, -1)"
            >上移</el-button
          >
          <el-button
            size="small"
            text
            :disabled="i === selectedList.length - 1"
            @click.stop="moveSelected(i, 1)"
            >下移</el-button
          >
          <el-button size="small" text type="danger" @click.stop="removeSelected(i)"
            >移除</el-button
          >
        </div>
      </div>
      </TransitionGroup>
    </div>
    <template #footer>
      <el-button @click="selectedVisible = false">取消</el-button>
      <el-button type="danger" plain :disabled="!selectedList.length" @click="clearSelected"
        >清空</el-button
      >
      <el-button type="primary" @click="confirmSelected">确定（按此顺序）</el-button>
    </template>
  </el-dialog>

  <!-- 选择学生 -->
  <el-drawer v-model="studentDrawerVisible" title="选择学生" size="60%">
    <div class="picker-toolbar">
      <el-input
        v-model="sKeyword"
        placeholder="按姓名搜索"
        clearable
        style="width: 220px"
        @keyup.enter="loadStudents"
      />
      <el-button type="primary" @click="loadStudents">查询</el-button>
      <span class="picked-count">已选 {{ pickedStudentIds.length }} 名学生</span>
    </div>

    <el-table :data="students" border stripe v-loading="sLoading" @row-click="onStudentRowClick">
      <el-table-column label="选择" width="60">
        <template #default="{ row }">
          <el-checkbox
            :model-value="isStudentPicked(row.id)"
            @change="(v: boolean) => toggleStudentPick(row.id, v)"
          />
        </template>
      </el-table-column>
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="grade" label="年级" />
    </el-table>

    <template #footer>
      <el-button @click="studentDrawerVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmStudentPick">确定</el-button>
    </template>
  </el-drawer>

  <!-- 题目详情 -->
  <el-dialog v-model="qDetailVisible" title="题目详情" width="640px">
    <template v-if="currentQuestion">
      <div class="q-title"><RichContent :html="currentQuestion.title" /></div>
      <el-descriptions :column="3" border class="q-meta">
        <el-descriptions-item label="题型">{{
          typeLabel(currentQuestion.type)
        }}</el-descriptions-item>
        <el-descriptions-item label="难度">{{ currentQuestion.difficulty }}</el-descriptions-item>
        <el-descriptions-item label="知识点"
          >{{ currentQuestion.knowledgeTag || '—'
          }}{{
            currentQuestion.knowledgeSubTag ? ' › ' + currentQuestion.knowledgeSubTag : ''
          }}</el-descriptions-item
        >
      </el-descriptions>
      <div v-if="currentQuestion.options" class="q-section">
        <div class="q-label">选项</div>
        <template v-if="Array.isArray(currentQuestion.options)">
          <div v-for="(opt, i) in currentQuestion.options" :key="i" class="q-option">
            {{ String.fromCharCode(65 + i) }}.
            {{ typeof opt === 'string' ? opt : JSON.stringify(opt) }}
          </div>
        </template>
        <div v-else>{{ JSON.stringify(currentQuestion.options) }}</div>
      </div>
      <div v-if="currentQuestion.body" class="q-section">
        <div class="q-label">补充说明</div>
        <RichContent :html="currentQuestion.body" />
      </div>
      <div v-if="currentQuestion.answer" class="q-section">
        <div class="q-label">答案</div>
        <RichContent :html="currentQuestion.answer" />
      </div>
      <div v-if="currentQuestion.analysis" class="q-section">
        <div class="q-label">解析</div>
        <div class="q-text">{{ currentQuestion.analysis }}</div>
      </div>
    </template>
    <template #footer>
      <el-button type="primary" @click="qDetailVisible = false">关闭</el-button>
    </template>
  </el-dialog>

  <!-- 题目图片放大预览（抽题列表/已选列表） -->
  <el-dialog v-model="imgPreviewVisible" title="查看原图" width="70%" top="6vh">
    <div class="img-preview">
      <img :src="imgPreviewUrl" alt="题目图片" />
    </div>
  </el-dialog>

  <!-- 导出作业 PDF -->
  <el-dialog v-model="exportVisible" title="导出作业 PDF" width="1000px" top="4vh">
    <div class="export-layout">
      <div class="export-options">
        <el-form label-width="90px" size="small">
          <el-form-item label="显示答案"><el-switch v-model="layout.showAnswer" /></el-form-item>
          <el-form-item label="字号">
            <el-radio-group v-model="layout.fontSize">
              <el-radio-button value="14">小</el-radio-button>
              <el-radio-button value="16">中</el-radio-button>
              <el-radio-button value="18">大</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="行距">
            <el-radio-group v-model="layout.lineHeight">
              <el-radio-button value="1.6">紧凑</el-radio-button>
              <el-radio-button value="1.8">正常</el-radio-button>
              <el-radio-button value="2.2">宽松</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="每题一页">
            <el-switch v-model="layout.onePerPage" />
          </el-form-item>
          <el-form-item v-if="layout.onePerPage" label=" ">
            <span class="opt-hint"
              >每题独占一页，题目下方到页底自动成为空白书写区（适合解答题作业）</span
            >
          </el-form-item>
          <el-form-item label="答题留白"
            ><el-switch v-model="layout.showAnswerArea" :disabled="layout.onePerPage"
          /></el-form-item>
          <el-form-item v-if="layout.showAnswerArea && !layout.onePerPage" label="留白高度">
            <el-slider v-model="layout.answerAreaHeight" :min="20" :max="160" :step="10" />
          </el-form-item>
          <el-form-item label="显示分值"><el-switch v-model="layout.showScore" /></el-form-item>
          <el-form-item v-if="layout.showScore" label="每题分值">
            <el-input-number v-model="layout.scorePerQuestion" :min="1" :max="100" />
          </el-form-item>
          <el-form-item label="学校名称"
            ><el-input v-model="layout.schoolName" placeholder="页眉显示"
          /></el-form-item>
          <el-form-item label="姓名/年级/分数栏"
            ><el-switch v-model="layout.showNameLine"
          /></el-form-item>
          <el-form-item label="显示题型"><el-switch v-model="layout.showType" /></el-form-item>
          <el-form-item label="显示知识点"
            ><el-switch v-model="layout.showKnowledge"
          /></el-form-item>
        </el-form>
      </div>
      <div class="export-preview">
        <div class="paper" v-html="previewHtml"></div>
      </div>
    </div>
    <template #footer>
      <div class="export-footer">
        <span class="export-tip"
          >提示：弹出打印窗口后，请在打印对话框的「更多设置」中取消勾选「页眉和页脚」，即可去掉左下角的
          about:blank 与左上角的日期时间。</span
        >
        <span class="export-actions">
          <el-button @click="exportVisible = false">取消</el-button>
          <el-button type="primary" @click="doExport">导出 PDF</el-button>
        </span>
      </div>
    </template>
  </el-dialog>

  <!-- 课时总结：复用可复用组件（作业列表与总结列表共用） -->
  <LessonSummaryDialog
    v-model="summaryVisible"
    :homework-id="summaryHomeworkId"
    :summary-id="summaryEditId"
    :school-name="layout.schoolName"
    @saved="load"
  />

  <!-- 录入成绩 -->
  <el-dialog v-model="scoreVisible" title="录入成绩" width="560px">
    <el-table :data="scoreRows" border max-height="480">
      <el-table-column prop="name" label="学生" width="120" />
      <el-table-column prop="grade" label="年级" width="100" />
      <el-table-column label="得分">
        <template #default="{ row }">
          <el-input-number v-model="row.score" :min="0" :precision="1" size="small" />
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="scoreVisible = false">取消</el-button>
      <el-button type="primary" @click="saveScores">保存成绩</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { Plus, Edit, EditPen, Download, Delete, Notebook } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getHomeworks,
  getHomework,
  getHomeworkQuestions,
  createHomework,
  updateHomework,
  deleteHomework,
  bulkDeleteHomeworks,
  saveHomeworkScores
} from '../../api/homework'
import { getQuestions, getQuestionTags, getQuestionSubTags } from '../../api/question'
import { getStudents } from '../../api/student'
import { getSummaries } from '../../api/summary'
import RichContent from '../../components/RichContent.vue'
import AiAnswerButton from '../../components/AiAnswerButton.vue'
import LessonSummaryDialog from '../../components/LessonSummaryDialog.vue'
import { printHtml, PAPER_FONT } from '../../utils/printHtml'
import { renderMathInHtml } from '../../utils/mathRender'
import { sanitizeHtml, sanitizeRichHtml } from '../../utils/sanitizeHtml'
import type { Homework, Question } from '../../types'

const list = ref<Homework[]>([])
const questions = ref<Question[]>([])
const loading = ref(false)
const createVisible = ref(false)
const editingId = ref<number | null>(null) // 非空 = 编辑已有作业

// 作业列表分页
const page = ref(1)
const pageSize = 20
const total = ref(0)
const scoreVisible = ref(false)
const scoreRows = ref<any[]>([])
const scoreHomeworkId = ref<number | null>(null)
const form = reactive<any>({ questionIds: [], status: 'published' })

// —— 抽题框状态 ——
const drawerVisible = ref(false)
const qDetailVisible = ref(false)
const currentQuestion = ref<any>(null)
const pickMode = ref('multi') // multi | single
const pickedIds = ref<number[]>([])
const qKeyword = ref('')
const qType = ref('')
const qKnowledgeTag = ref('')
const qKnowledgeOptions = ref<string[]>([])
const qKnowledgeSubTag = ref('')
const qSubKnowledgeOptions = ref<string[]>([])
const qLoading = ref(false)
const qPage = ref(1)
const qPageSize = 10
const qTotal = ref(0)
const pickerFull = ref(true) // 抽题列表默认完整显示题目；题库题量大时可关掉只看摘要
const imgPreviewVisible = ref(false)
const imgPreviewUrl = ref('')

// —— 选择学生状态 ——
const studentDrawerVisible = ref(false)
const students = ref<any[]>([])
const pickedStudentIds = ref<number[]>([])
const sKeyword = ref('')
const sLoading = ref(false)

const typeMap: Record<string, string> = {
  choice: '选择题',
  fill: '填空题',
  solve: '解答题'
}
const typeLabel = (t: string) => typeMap[t] || t

// 选项数组统一转成可展示文本（兼容对象选项）
const optionTexts = (q: any): string[] => {
  if (!Array.isArray(q?.options)) return []
  return q.options.map((opt: any) => (typeof opt === 'string' ? opt : JSON.stringify(opt)))
}

// —— 状态与截止时间的展示辅助 ——
const statusMap: Record<
  string,
  { label: string; type: 'success' | 'warning' | 'info' | 'primary' | 'danger' }
> = {
  draft: { label: '草稿', type: 'info' },
  published: { label: '已发布', type: 'success' },
  closed: { label: '已截止', type: 'warning' }
}
const statusLabel = (s: string) => statusMap[s]?.label || s || '—'
const statusTagType = (s: string): 'success' | 'warning' | 'info' | 'primary' | 'danger' =>
  statusMap[s]?.type || 'info'

// 日期时间格式化：DATE / ISO / 字符串 → YYYY-MM-DD HH:mm
const formatDateTime = (d: any) => {
  if (!d) return '—'
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return String(d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// 截止时间是否已过（用于标红提示）
const isExpired = (d: any) => {
  if (!d) return false
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return false
  return date.getTime() < Date.now()
}

const load = async () => {
  loading.value = true
  try {
    const res = await getHomeworks({ page: page.value, pageSize })
    list.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editingId.value = null
  Object.keys(form).forEach((k) => delete form[k])
  form.questionIds = []
  form.studentIds = []
  form.status = 'published'
  pickMode.value = 'multi'
  pickedIds.value = []
  qKeyword.value = ''
  qType.value = ''
  qKnowledgeTag.value = ''
  qKnowledgeSubTag.value = ''
  qSubKnowledgeOptions.value = []
  createVisible.value = true
}

// 编辑已有作业：拉取详情并预填表单（题目/学生/截止/备注/状态均可改）
const openEdit = async (row: any) => {
  const detail = await getHomework(row.id)
  editingId.value = row.id
  Object.keys(form).forEach((k) => delete form[k])
  form.title = detail.title || ''
  form.questionIds = detail.questionIds || []
  form.studentIds = detail.studentIds || []
  form.endAt = detail.endAt || null
  form.remark = detail.remark || ''
  form.status = detail.status || 'published'
  pickMode.value = 'multi'
  pickedIds.value = []
  qKeyword.value = ''
  qType.value = ''
  qKnowledgeTag.value = ''
  qKnowledgeSubTag.value = ''
  qSubKnowledgeOptions.value = []
  createVisible.value = true
}

// 按当前一级知识点加载二级候选
const loadSubKnowledgeOptions = async () => {
  if (!qKnowledgeTag.value) {
    qSubKnowledgeOptions.value = []
    return
  }
  try {
    const subs = await getQuestionSubTags(qKnowledgeTag.value)
    qSubKnowledgeOptions.value = subs.map((s) => s.name)
  } catch {
    qSubKnowledgeOptions.value = []
  }
}

// 一级知识点变化：清空已选二级，刷新二级候选并重新查询
const onPrimaryKnowledgeChange = async () => {
  qKnowledgeSubTag.value = ''
  await loadSubKnowledgeOptions()
  qSearch()
}

// 加载题目列表（抽题框内搜索/筛选）
const loadQuestions = async () => {
  qLoading.value = true
  try {
    const params: any = {
      keyword: qKeyword.value,
      type: qType.value,
      page: qPage.value,
      pageSize: qPageSize
    }
    if (qKnowledgeTag.value) params.knowledgeTag = qKnowledgeTag.value
    if (qKnowledgeSubTag.value) params.knowledgeSubTag = qKnowledgeSubTag.value
    const res = await getQuestions(params)
    questions.value = res.list
    qTotal.value = res.total
  } finally {
    qLoading.value = false
  }
}

const qSearch = () => {
  qPage.value = 1
  loadQuestions()
}

// 打开抽题框
const openPicker = async () => {
  pickedIds.value = [...(form.questionIds || [])]
  qPage.value = 1
  // 每次打开刷新知识点选项，题库新增知识点后可立即筛选
  qKnowledgeOptions.value = await getQuestionTags().catch(() => [])
  await loadSubKnowledgeOptions()
  await loadQuestions()
  drawerVisible.value = true
}

// 切换单选/多选时清空已选
const onModeChange = () => {
  pickedIds.value = []
}

const isPicked = (id: number) => pickedIds.value.includes(id)

const togglePick = (id: number, checked: boolean) => {
  if (checked) {
    if (!pickedIds.value.includes(id)) pickedIds.value.push(id)
  } else {
    pickedIds.value = pickedIds.value.filter((x) => x !== id)
  }
}

const pickSingle = (id: number) => {
  pickedIds.value = [id]
}

// 单选/多选：点击整行即可选中/取消（多选模式点行切换，单选模式点行即选中）
const onRowClick = (row: any) => {
  if (pickMode.value === 'single') pickSingle(row.id)
  else togglePick(row.id, !isPicked(row.id))
}

// 点击题干中的图片：放大预览，并阻止触发行选中/切换
const onQuestionCellClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target?.tagName !== 'IMG') return
  const src = target.getAttribute('src')
  if (!src) return
  e.stopPropagation()
  imgPreviewUrl.value = src
  imgPreviewVisible.value = true
}

// 已选行高亮
const rowClassName = ({ row }: { row: any }) => (isPicked(row.id) ? 'row-picked' : '')

// 清空已选
const clearPicked = () => {
  pickedIds.value = []
}

// 确认抽题
const confirmPick = () => {
  if (pickMode.value === 'single' && !pickedIds.value.length) {
    ElMessage.warning('请选择一道题目')
    return
  }
  form.questionIds = [...pickedIds.value]
  drawerVisible.value = false
}

// —— 已选题目：查看与手动排序 ——
const selectedVisible = ref(false)
const selectedLoading = ref(false)
const selectedList = ref<any[]>([])
const dragIndex = ref<number | null>(null)
const swapIndex = ref<number | null>(null) // 点选互换：已选中待交换的题序号
const selectedFullIds = ref<number[]>([]) // 已展开查看完整题目的题目 id

// 打开「已选题目」：按当前顺序取回题目详情（顺序 = 打印/导出顺序）
const openSelected = async () => {
  const ids: number[] = form.questionIds || []
  if (!ids.length) return
  swapIndex.value = null
  selectedFullIds.value = []
  selectedVisible.value = true
  selectedLoading.value = true
  try {
    const rows: any[] = await getQuestions({ ids: ids.join(',') })
    const map = new Map(rows.map((q: any) => [q.id, q]))
    // 依据 form.questionIds 的顺序排列；已被删除的题目自动剔除
    selectedList.value = ids.map((id) => map.get(id)).filter(Boolean)
  } catch {
    selectedList.value = []
  } finally {
    selectedLoading.value = false
  }
}

// 点击整行：点选两题互换位置（点自己 = 取消选中）
const onSelRowClick = (index: number) => {
  if (swapIndex.value === null) {
    swapIndex.value = index
    return
  }
  if (swapIndex.value === index) {
    swapIndex.value = null
    return
  }
  const from = swapIndex.value
  const arr = selectedList.value.slice()
  ;[arr[from], arr[index]] = [arr[index], arr[from]]
  selectedList.value = arr
  swapIndex.value = null
  ElMessage.success(`已交换第 ${from + 1} 题与第 ${index + 1} 题的位置`)
}

// —— 排序反馈：高亮刚移动的题 + 把它滚进视野 + 文字提示 ——
// 之前上移/下移只改数据，列表里完全看不出是哪一题动了，所以这三件事要一起做。
const flashId = ref<number | null>(null)
let flashTimer: ReturnType<typeof setTimeout> | null = null

const scrollRowIntoView = (id: number) => {
  const el = document.querySelector(`.sel-row[data-id="${id}"]`)
  if (el && typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
}

// 把第 from 题插到 to 位置（其余题目依次让位）。
// feedback=false 用于拖拽过程中的实时预览——那时每划过一行都会触发，不能弹提示。
const moveTo = async (from: number, to: number, feedback = true) => {
  const len = selectedList.value.length
  if (from === to || from < 0 || to < 0 || from >= len || to >= len) return
  const arr = selectedList.value.slice()
  const [item] = arr.splice(from, 1)
  arr.splice(to, 0, item)
  selectedList.value = arr
  swapIndex.value = null // 位置已变化，清掉点选态避免错位
  if (!feedback) return

  flashId.value = item.id
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flashId.value = null), 1800)
  ElMessage.success(`第 ${from + 1} 题已移到第 ${to + 1} 位`)
  await nextTick()
  scrollRowIntoView(item.id)
}

// 上移 / 下移
const moveSelected = (index: number, delta: number) => {
  moveTo(index, index + delta)
}

/**
 * 直接改题号：输入目标位置后回车（或失焦）即生效。
 * 这里按「题目 id」定位而不是按行号：重排会让 DOM 移动、输入框失焦再触发一次 blur，
 * 那时用 id 重新算出当前位置，再拿同一个数字来一次就是空操作，天然幂等。
 */
const applyGoto = (id: number, raw: string) => {
  const len = selectedList.value.length
  const from = selectedList.value.findIndex((q) => q.id === id)
  if (from < 0) return
  const n = Number(String(raw).trim())
  if (!Number.isInteger(n) || n < 1 || n > len) {
    ElMessage.warning(`题号请填 1 ~ ${len} 之间的整数`)
    return
  }
  moveTo(from, n - 1)
}

const onGoto = (id: number, e: Event) => {
  const el = e.target as HTMLInputElement
  applyGoto(id, el.value)
  // 输入非法或原地不动时，把框里的数字恢复成当前真实题号
  const idx = selectedList.value.findIndex((q) => q.id === id)
  if (idx >= 0) el.value = String(idx + 1)
}

const onGotoEsc = (index: number, e: Event) => {
  const el = e.target as HTMLInputElement
  el.value = String(index + 1)
  el.blur()
}

const removeSelected = (index: number) => {
  selectedList.value = selectedList.value.filter((_, i) => i !== index)
  // 维护点选态：删掉选中项则取消；删掉前面的项则序号前移
  if (swapIndex.value === null) return
  if (swapIndex.value === index) swapIndex.value = null
  else if (swapIndex.value > index) swapIndex.value -= 1
}

// 「查看整题」：在排序列表中就地展开 / 收起完整题目
const isSelectedFull = (id: number) => selectedFullIds.value.includes(id)
const toggleSelectedFull = (id: number) => {
  if (isSelectedFull(id)) {
    selectedFullIds.value = selectedFullIds.value.filter((x) => x !== id)
  } else {
    selectedFullIds.value = [...selectedFullIds.value, id]
  }
}

const clearSelected = () => {
  selectedList.value = []
  swapIndex.value = null
  selectedFullIds.value = []
}

// 拖拽排序：拖过某一行即把该行插到目标位置（实时预览）
const onSelDragStart = (index: number) => {
  dragIndex.value = index
  swapIndex.value = null
}
const onSelDragOver = (index: number) => {
  if (dragIndex.value === null || dragIndex.value === index) return
  moveTo(dragIndex.value, index, false) // 拖拽预览不弹提示
  dragIndex.value = index
}
const onSelDragEnd = () => {
  dragIndex.value = null
}
const onSelDrop = () => {
  dragIndex.value = null
}

// 确定：把当前顺序写回表单（并同步抽题框的选中态）
const confirmSelected = () => {
  form.questionIds = selectedList.value.map((q) => q.id)
  pickedIds.value = [...form.questionIds]
  swapIndex.value = null
  selectedVisible.value = false
  ElMessage.success(`已保存题目顺序（共 ${form.questionIds.length} 题）`)
}

// 加载学生列表（选择学生抽屉内）
const loadStudents = async () => {
  sLoading.value = true
  try {
    students.value = await getStudents({ keyword: sKeyword.value })
  } finally {
    sLoading.value = false
  }
}

// 打开选择学生抽屉
const openStudentPicker = async () => {
  pickedStudentIds.value = [...(form.studentIds || [])]
  await loadStudents()
  studentDrawerVisible.value = true
}

const isStudentPicked = (id: number) => pickedStudentIds.value.includes(id)

const toggleStudentPick = (id: number, checked: boolean) => {
  if (checked) {
    if (!pickedStudentIds.value.includes(id)) pickedStudentIds.value.push(id)
  } else {
    pickedStudentIds.value = pickedStudentIds.value.filter((x) => x !== id)
  }
}

const onStudentRowClick = (row: any) => {
  toggleStudentPick(row.id, !isStudentPicked(row.id))
}

const confirmStudentPick = () => {
  form.studentIds = [...pickedStudentIds.value]
  studentDrawerVisible.value = false
}

// 查看题目详情
const showDetail = (row: any) => {
  currentQuestion.value = row
  qDetailVisible.value = true
}

// —— 导出 PDF 状态与排版选项 ——
const exportVisible = ref(false)
const exportLoading = ref(false)
const exportHomework = ref<any>(null)
const exportQuestions = ref<any[]>([])
const exportStudents = ref<any[]>([])

const layout = reactive({
  showAnswer: false,
  fontSize: '16', // px
  lineHeight: '1.8',
  onePerPage: false, // 每题独占一页，余下为空白书写区
  showAnswerArea: true,
  answerAreaHeight: 60, // px
  showScore: true,
  scorePerQuestion: 5,
  schoolName: '',
  showNameLine: true,
  showType: true,
  showKnowledge: false
})

// HTML 转义，避免题目内容被解析为标签
const escapeHtml = (s: any) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return map[c]
  })

const safeQuestionHtml = (html: unknown) => sanitizeRichHtml(String(html ?? ''))

// 生成「姓名/年级/分数」填写框（有值则预填，无值留空方框）
const fillLine = (val?: string) =>
  `<span style="display:inline-block;min-width:80px;height:1.6em;line-height:1.6em;border:1px solid #666;border-radius:2px;padding:0 6px;vertical-align:middle;">${escapeHtml(val ?? '') || '&nbsp;'}</span>`

// 根据排版选项生成作业纸 HTML（预览与导出共用，保证所见即所得）
const buildHomeworkHtml = () => {
  const fs = Number(layout.fontSize)
  const lh = layout.lineHeight
  const title = exportHomework.value?.title || '数学作业'
  const questions = exportQuestions.value
  const total = questions.reduce(
    (s: number) => s + (layout.showScore ? layout.scorePerQuestion : 0),
    0
  )

  const renderHeader = (st?: any) => `
    <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:18px;">
      ${layout.schoolName ? `<div style="font-size:${fs + 2}px;font-weight:600;letter-spacing:3px;">${escapeHtml(layout.schoolName)}</div>` : ''}
      <div style="font-size:${fs + 6}px;font-weight:700;margin:6px 0;">${escapeHtml(title)}</div>
      <div style="font-size:${fs - 2}px;color:#555;display:flex;justify-content:space-between;align-items:center;padding:0 6px;">
        ${layout.showNameLine ? `<span>姓名：${fillLine(st?.name)}　年级：${fillLine(st?.grade)}　分数：${fillLine('')}</span>` : '<span></span>'}
        ${layout.showScore ? `<span>总分：${total} 分</span>` : ''}
      </div>
    </div>`

  const renderBody = () =>
    questions
      .map((q, i) => {
        const no = i + 1
        const opts =
          q.options && Array.isArray(q.options)
            ? `<div style="margin:6px 0 0 22px;">${q.options
                .map(
                  (o: any, j: number) =>
                    `<div style="margin:2px 0;">${String.fromCharCode(65 + j)}. ${escapeHtml(
                      typeof o === 'string' ? o : JSON.stringify(o)
                    )}</div>`
                )
                .join('')}</div>`
            : ''
        return `
      <div style="margin-bottom:16px;page-break-inside:avoid;">
        <div style="margin-bottom:4px;">
          <span style="font-weight:700;">${no}.</span>
          ${layout.showType ? `<span style="color:#999;font-size:${fs - 2}px;margin-left:6px;">【${escapeHtml(typeLabel(q.type))}】</span>` : ''}
          ${layout.showKnowledge && q.knowledgeTag ? `<span style="color:#999;font-size:${fs - 2}px;margin-left:6px;">${escapeHtml(q.knowledgeTag)}${q.knowledgeSubTag ? ' › ' + escapeHtml(q.knowledgeSubTag) : ''}</span>` : ''}
          ${layout.showScore ? `<span style="float:right;color:#666;">（${layout.scorePerQuestion} 分）</span>` : ''}
        </div>
        <div>${safeQuestionHtml(q.title)}</div>
        ${opts}
        ${q.body ? `<div style="margin-top:4px;">${safeQuestionHtml(q.body)}</div>` : ''}
        ${layout.showAnswerArea && !layout.onePerPage ? `<div style="height:${layout.answerAreaHeight}px;"></div>` : ''}
        ${layout.showAnswer && q.answer ? `<div style="color:#c0392b;margin-top:4px;"><b>【答案与解析】</b>${safeQuestionHtml(q.answer)}</div>` : ''}
      </div>
      ${
        layout.onePerPage && i < questions.length - 1
          ? '<div class="page-break" style="page-break-after:always;"></div>'
          : ''
      }`
      })
      .join('')

  // 作业选中了学生：按学生每人一份（分页）；否则生成一份空模板
  const students = exportStudents.value.length ? exportStudents.value : [null]
  const paperStyle = `font-family:${PAPER_FONT};font-size:${fs}px;line-height:${lh};color:#222;padding:28px;max-width:800px;margin:0 auto;background:#fff;`

  return students
    .map(
      (st, idx) =>
        `<div style="${paperStyle}${idx < students.length - 1 ? 'page-break-after:always;' : ''}">${renderHeader(st)}${renderBody()}</div>`
    )
    .join('')
}

// 预览 HTML：先消毒再公式渲染（与打印路径一致，堵住题目富文本潜在 XSS）
const previewHtml = computed(() => renderMathInHtml(sanitizeHtml(buildHomeworkHtml())))

// 打开导出预览
const openExport = async (row: any) => {
  exportHomework.value = row
  exportQuestions.value = []
  exportStudents.value = []
  exportVisible.value = true
  exportLoading.value = true
  try {
    exportQuestions.value = await getHomeworkQuestions(row.id)
    // 作业选中的学生，导出时预填姓名/年级
    const ids: number[] = row.studentIds || []
    if (ids.length) {
      const students = await getStudents()
      exportStudents.value = students.filter((s: any) => ids.includes(s.id))
    }
  } finally {
    exportLoading.value = false
  }
}

// 导出：写入独立打印窗口，触发浏览器“另存为 PDF”
const doExport = () => {
  if (!exportQuestions.value.length) {
    ElMessage.warning('该作业没有题目')
    return
  }
  const okFlag = printHtml(exportHomework.value?.title || '作业', buildHomeworkHtml())
  if (!okFlag) ElMessage.warning('浏览器拦截了弹出窗口，请允许本站弹窗后再试')
}

/* ===================== 课时总结 ===================== */
// 编辑器已抽成 LessonSummaryDialog 组件（作业列表与「课时总结」菜单页共用）
const summaryVisible = ref(false)
const summaryHomeworkId = ref<number | null>(null)
const summaryEditId = ref<number | null>(null)

// 从作业行打开：组件内部自行载入该作业的学生/题目数/历史记录
const openSummary = (row: any) => {
  summaryHomeworkId.value = row.id
  summaryEditId.value = null
  summaryVisible.value = true
}
const save = async () => {
  if (!(form.studentIds || []).length) {
    ElMessage.warning('请先选择学生')
    return
  }
  if (editingId.value) {
    await updateHomework(editingId.value, form)
    ElMessage.success('修改已保存')
  } else {
    await createHomework(form)
    ElMessage.success('发布成功')
  }
  editingId.value = null
  createVisible.value = false
  load()
}

const openScore = async (row: any) => {
  const [students, detail] = await Promise.all([getStudents(), getHomework(row.id)])
  const studentIds: number[] = detail.studentIds || []
  if (!studentIds.length) {
    ElMessage.warning('该作业还没有选择学生，请重新发布并选择学生')
    return
  }
  const scoreMap = new Map((detail.submissions || []).map((s: any) => [s.studentId, s.score]))
  scoreRows.value = students
    .filter((st: any) => studentIds.includes(st.id))
    .map((st: any) => ({
      id: st.id,
      name: st.name,
      grade: st.grade || '—',
      score: scoreMap.get(st.id) ?? 0
    }))
  scoreHomeworkId.value = row.id
  scoreVisible.value = true
}

const saveScores = async () => {
  const scores = scoreRows.value.map((r) => ({ studentId: r.id, score: Number(r.score) || 0 }))
  await saveHomeworkScores(scoreHomeworkId.value!, scores)
  ElMessage.success('成绩已保存')
  scoreVisible.value = false
}

const remove = async (row: any) => {
  // 该作业下的课时总结会一并删除，删除前提示数量，避免误删教学记录
  let summaryCount = 0
  try {
    summaryCount = ((await getSummaries({ homeworkId: row.id })) || []).length
  } catch {
    /* 统计失败不阻塞删除 */
  }
  try {
    await ElMessageBox.confirm(
      `确定删除作业「${row.title}」？将同时删除其题目/学生关联与成绩记录` +
        (summaryCount ? `，以及 ${summaryCount} 条课时总结` : '') +
        '。此操作不可恢复。',
      '删除作业确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  try {
    await deleteHomework(row.id)
    ElMessage.success('删除成功')
    await load()
  } catch (err) {
    // 错误提示已由 request.ts 全局弹出
    console.error('删除作业失败', err)
  }
}

/* ===================== 批量删除 ===================== */
const tableRef = ref<any>()
const selectedIds = ref<number[]>([])
const bulkDeleting = ref(false)

const onSelectionChange = (rows: any[]) => {
  selectedIds.value = rows.map((r) => r.id)
}

const clearSelection = () => {
  tableRef.value?.clearSelection()
  selectedIds.value = []
}

const bulkRemove = async () => {
  const ids = [...selectedIds.value]
  if (!ids.length) return

  let summaryCount = 0
  try {
    const all = (await getSummaries({})) || []
    summaryCount = all.filter((s) => ids.includes(s.homeworkId)).length
  } catch {
    /* 统计失败不阻塞删除 */
  }

  try {
    await ElMessageBox.confirm(
      `确定删除所选 ${ids.length} 个作业？将同时删除其题目/学生关联、成绩记录` +
        (summaryCount ? `，以及 ${summaryCount} 条课时总结` : '') +
        '。此操作不可恢复。',
      '批量删除确认',
      { type: 'warning', confirmButtonText: `删除 ${ids.length} 个`, cancelButtonText: '取消' }
    )
  } catch {
    return
  }

  bulkDeleting.value = true
  try {
    const res = await bulkDeleteHomeworks(ids)
    ElMessage.success(
      `已删除 ${res.deleted} 个作业` + (res.summaries ? `（含 ${res.summaries} 条课时总结）` : '')
    )
    clearSelection()
    // 删除后当前页可能已空，回退页码避免停在空白页
    if (page.value > 1 && list.value.length <= ids.length) page.value -= 1
    await load()
  } catch (err) {
    console.error('批量删除作业失败', err)
  } finally {
    bulkDeleting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.toolbar {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
}
.question-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}
.picked-count {
  color: var(--ink-soft);
  font-size: 13px;
}
/* 抽题列表题目预览：默认完整展示题干 + 选项 + 补充说明；关闭「完整题目」后只保留两行摘要 */
.q-cell-preview {
  font-size: 13px;
  line-height: 1.6;
}
.q-cell.is-compact .q-cell-preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.q-cell-preview :deep(img),
.q-cell-body :deep(img),
.sel-title :deep(img) {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
  cursor: zoom-in;
}
.q-cell-preview :deep(.katex-display),
.q-cell-body :deep(.katex-display) {
  overflow-x: auto;
  overflow-y: hidden;
}
.q-cell-options {
  margin: 6px 0 0 4px;
}
.q-cell-option {
  line-height: 1.7;
  color: var(--ink);
}
.q-cell-body {
  margin-top: 6px;
  font-size: 13px;
}
.picker-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.picker-hint {
  color: var(--ink-soft);
  font-size: 12px;
}
/* 抽题表格：整行可点击 */
:deep(.el-table__body tr) {
  cursor: pointer;
}
/* 已选行高亮（含 hover 时保持） */
:deep(.el-table .row-picked),
:deep(.el-table .row-picked:hover > td.el-table__cell) {
  background: var(--moss-soft) !important;
}
/* 放大选择框，便于点击 */
.pick-check {
  transform: scale(1.35);
}

/* —— 已选题目查看 / 排序 —— */
.sel-hint {
  margin-bottom: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--moss-soft);
  color: var(--moss-deep);
  font-size: 13px;
  line-height: 1.6;
}
.sel-wrap {
  max-height: 68vh;
  overflow-y: auto;
  padding-right: 4px;
}
/* 行容器：TransitionGroup 的重排位移动画需要一个相对定位的父级 */
.sel-list {
  position: relative;
}
/*
 * 重排时整行平滑滑到新位置——这是「变化不明显」的主要解法。
 * 必须写成 .sel-row.sel-move：scoped 下 .sel-move 与 .sel-row 特异度相同，
 * 而 .sel-row 在后面又声明了自己的 transition，会把这里的规则整条覆盖掉，
 * Vue 的 hasCSSTransform 检测不到 transform 就直接跳过 FLIP 动画（踩过一次）。
 */
.sel-row.sel-move {
  transition: transform 0.34s var(--ease);
}
.sel-row.sel-enter-active,
.sel-row.sel-leave-active {
  transition:
    opacity 0.22s var(--ease),
    transform 0.22s var(--ease);
}
.sel-row.sel-enter-from,
.sel-row.sel-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.sel-row.sel-leave-active {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 0;
}
.sel-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 18px;
  margin-bottom: 10px;
  border: 1px solid var(--edge);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
}
.sel-row:hover {
  border-color: rgba(150, 104, 26, 0.5);
  box-shadow: 0 2px 8px rgba(24, 30, 36, 0.08);
}
/* 点选待交换 */
.sel-row.is-picked {
  border-color: var(--moss);
  background: var(--moss-soft);
  box-shadow: 0 0 0 2px rgba(150, 104, 26, 0.28);
}
.sel-row.is-dragging {
  opacity: 0.55;
  border-style: dashed;
}
/* 刚被移动的题：琥珀金描边 + 两次呼吸，明确告诉用户「动的是这一题」
   （只动 background-color，避免和 TransitionGroup 的 transform 位移打架） */
.sel-row.is-flash {
  border-color: var(--moss);
  box-shadow: 0 0 0 3px rgba(150, 104, 26, 0.3), var(--shadow-hover);
  animation: selFlash 0.75s var(--ease) 2;
}
@keyframes selFlash {
  0%,
  100% {
    background-color: rgba(255, 255, 255, 0.55);
  }
  50% {
    background-color: var(--moss-soft);
  }
}
/* 题号本身就是一个输入框：改数字 + 回车，可直接把该题移到目标位置 */
.sel-no {
  flex-shrink: 0;
  width: 46px;
  height: 30px;
  padding: 0 4px;
  text-align: center;
  border-radius: 8px;
  border: 1px solid var(--edge);
  background: rgba(255, 255, 255, 0.72);
  color: var(--moss-deep);
  font-family: var(--font-data);
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  font-weight: 700;
  outline: none;
  cursor: text;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
}
.sel-no:hover {
  border-color: rgba(150, 104, 26, 0.5);
  background: #fff;
}
.sel-no:focus {
  border-color: var(--moss);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(150, 104, 26, 0.2);
}
.sel-no.is-picked {
  background: var(--moss);
  color: var(--on-accent);
  border-color: var(--moss);
}
.sel-handle {
  flex-shrink: 0;
  cursor: grab;
  color: var(--ink-soft);
  font-size: 16px;
  line-height: 22px;
  user-select: none;
}
.sel-handle:active {
  cursor: grabbing;
}
.sel-main {
  flex: 1;
  min-width: 0;
}
.sel-title {
  font-size: 14px;
  line-height: 1.65;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sel-title.is-full {
  display: block;
  overflow: visible;
}
.sel-title :deep(.katex-display) {
  overflow-x: auto;
  overflow-y: hidden;
}
.sel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.sel-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 2px;
}
.q-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  line-height: 1.5;
}
.q-meta {
  margin-bottom: 12px;
}
.q-section {
  margin-bottom: 12px;
}
.q-label {
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 4px;
}
.q-text {
  white-space: pre-wrap;
  line-height: 1.6;
  color: var(--ink);
}
.q-option {
  line-height: 1.8;
  color: var(--ink);
}
.img-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: 72vh;
  overflow: auto;
}
.img-preview img {
  max-width: 100%;
  max-height: 72vh;
  object-fit: contain;
}
.export-layout {
  display: flex;
  gap: 16px;
  height: 66vh;
}
.export-options {
  width: 300px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid var(--line);
  padding-right: 12px;
}
.opt-hint {
  font-size: 12px;
  line-height: 1.6;
  color: var(--ink-soft);
}
.export-preview {
  flex: 1;
  overflow: auto;
  background: var(--paper-deep);
  padding: 12px;
  border-radius: 6px;
}
/* 预览中的分页标记：分页符本身无高度，打印窗口也没有这段样式，故只在预览里可见 */
.export-preview :deep(.page-break) {
  position: relative;
  margin: 20px 0;
  border-top: 1px dashed var(--line-strong);
}
.export-preview :deep(.page-break)::after {
  content: '分页';
  position: absolute;
  right: 0;
  top: -9px;
  padding: 0 8px;
  font-size: 11px;
  color: var(--ink-soft);
  background: #fff;
}
.paper {
  box-shadow: 0 2px 14px rgba(24, 30, 36, 0.14);
  border-radius: 2px;
  min-height: 100%;
}

.export-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  text-align: left;
}
.export-tip {
  font-size: 12px;
  color: var(--ink-soft);
  line-height: 1.5;
}
.export-actions {
  flex-shrink: 0;
}
.end-at--expired {
  color: var(--el-color-danger);
  font-weight: 600;
}
.pager {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
