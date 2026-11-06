import { useState } from 'react';
import { calculateQuadrant } from '../../types/task';
import { QUADRANTS_CONFIG } from '../../constants/quadrants';
import { Sparkles, X, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';

interface WizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmTask: (data: {
    title: string;
    importance: number;
    urgency: number;
  }) => void;
}

export const WizardModal: React.FC<WizardModalProps> = ({
  isOpen,
  onClose,
  onConfirmTask,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [importance, setImportance] = useState<number | null>(null);
  const [urgency, setUrgency] = useState<number | null>(null);
  const [taskTitle, setTaskTitle] = useState('');

  if (!isOpen) return null;

  const handleReset = () => {
    setStep(1);
    setImportance(null);
    setUrgency(null);
    setTaskTitle('');
  };

  const handleSelectImportant = (val: boolean) => {
    setImportance(val ? 8.5 : 2.5);
    setStep(2);
  };

  const handleSelectUrgent = (val: boolean) => {
    setUrgency(val ? 8.5 : 2.5);
    setStep(3);
  };

  const targetQuadrantId = importance !== null && urgency !== null ? calculateQuadrant(importance, urgency) : 'q1';
  const meta = QUADRANTS_CONFIG[targetQuadrantId];

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || importance === null || urgency === null) return;
    onConfirmTask({
      title: taskTitle.trim(),
      importance,
      urgency,
    });
    handleReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                象限决策向导
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                两步精准识别任务属性，科学计算坐标落位
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 进度指示 */}
        <div className="px-6 pt-4 flex items-center justify-between gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            步骤 {step} / 3
          </span>
        </div>

        <div className="p-6">
          {/* Step 1: 重要度问询 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                  第 1 步：价值与战略衡量 (纵轴 Y)
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2">
                  这件事是否直接影响你的核心目标或产生重大长期收益？
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  反思：如果不做，是否会带来不可承受的战略后果或阻碍核心成就？
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleSelectImportant(true)}
                  className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 text-left hover:border-indigo-500 hover:bg-indigo-50/50 dark:border-slate-800 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/20 transition-all group"
                >
                  <div className="h-5 w-5 rounded-full border border-slate-300 group-hover:border-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="h-2.5 w-2.5 rounded-full group-hover:bg-indigo-600 transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      是，这是重大关键事项（高重要度 · 8.5分）
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      关乎核心 KPI、个人健康、核心战略、关键项目成败。
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectImportant(false)}
                  className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 text-left hover:border-indigo-500 hover:bg-indigo-50/50 dark:border-slate-800 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/20 transition-all group"
                >
                  <div className="h-5 w-5 rounded-full border border-slate-300 group-hover:border-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="h-2.5 w-2.5 rounded-full group-hover:bg-indigo-600 transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      否，属于日常辅助或外部琐事（低重要度 · 2.5分）
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      例行公事、他人的附带请求、无核心产出的消遣杂物。
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: 紧迫性问询 */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                  第 2 步：时间敏感度判断 (横轴 X)
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-2">
                  这件事是否有即将到期的明确截止日或需要近期即刻行动？
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  反思：若延后 48 小时执行，是否会引发严重违约、卡点或危机？
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleSelectUrgent(true)}
                  className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 text-left hover:border-amber-500 hover:bg-amber-50/40 dark:border-slate-800 dark:hover:border-amber-500 dark:hover:bg-amber-950/20 transition-all group"
                >
                  <div className="h-5 w-5 rounded-full border border-slate-300 group-hover:border-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="h-2.5 w-2.5 rounded-full group-hover:bg-amber-500 transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      是，迫在眉睫，急需处理（高紧迫度 · 8.5分）
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      有明确且逼近的截止时间节点、突发问题或紧迫催办。
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectUrgent(false)}
                  className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 text-left hover:border-blue-500 hover:bg-blue-50/40 dark:border-slate-800 dark:hover:border-blue-500 dark:hover:bg-blue-950/20 transition-all group"
                >
                  <div className="h-5 w-5 rounded-full border border-slate-300 group-hover:border-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="h-2.5 w-2.5 rounded-full group-hover:bg-blue-500 transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      否，时间充裕，可做长期规划（低紧迫度 · 2.5分）
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      无即时压迫感，适合按节奏列入日程持续推进。
                    </p>
                  </div>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  ← 返回上一步修改重要性
                </button>
              </div>
            </div>
          )}

          {/* Step 3: 诊断结论与一键收纳 */}
          {step === 3 && (
            <form onSubmit={handleFinalSubmit} className="space-y-4">
              <div className={`p-4 rounded-2xl border ${meta.themeColor.border} ${meta.themeColor.headerBg}`}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    向导诊断完成！自动定位落位：
                  </h3>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${meta.themeColor.accentDot}`} />
                    <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                      {meta.name}
                    </span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${meta.themeColor.badgeBg}`}>
                    {meta.shortAction}
                  </span>
                </div>

                <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  坐标：紧迫度 {urgency?.toFixed(1)}，重要度 {importance?.toFixed(1)}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                  💡 <strong>行动建议</strong>：{meta.description}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  输入此任务的名称并直接入库
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="例如：完成第二季度经营数据复盘报告..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> 重新诊断
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={!taskTitle.trim()}
                    className="px-5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <span>保存并落位</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
