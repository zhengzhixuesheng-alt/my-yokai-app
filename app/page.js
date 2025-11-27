// app.js
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { allQuestionsPool, yokaiTypes } from '../data/quizData';

// ==========================================
// 1. パーティクル (人魂) コンポーネント
// ==========================================
const WispParticles = () => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // マウント後にランダム生成（サーバー/クライアント不一致防止）
    const newParticles = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100 + '%',
      delay: Math.random() * 5 + 's',
      duration: Math.random() * 5 + 8 + 's',
      size: Math.random() * 10 + 4 + 'px',
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-cyan-400 blur-[4px] opacity-60 animate-wisp"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
};

// ==========================================
// 2. CSSのみで描画するゴーストキャラクター
// ==========================================
const GhostCharacter = () => {
  return (
    <div className="relative w-32 h-40 animate-float">
      {/* 本体 */}
      <div className="absolute inset-0 bg-white shadow-[0_0_30px_rgba(34,211,238,0.5)] rounded-t-[50%] rounded-b-[20px]">
        {/* しっぽ (足元を波打たせる装飾) */}
        <div className="absolute -bottom-2 flex w-full justify-center space-x-1">
          <div className="w-4 h-4 bg-white rounded-full"></div>
          <div className="w-4 h-4 bg-white rounded-full translate-y-1"></div>
          <div className="w-4 h-4 bg-white rounded-full"></div>
        </div>
      </div>
      {/* 顔 */}
      <div className="absolute top-12 left-6 w-4 h-6 bg-slate-900 rounded-full rotate-[-10deg]"></div>
      <div className="absolute top-12 right-6 w-4 h-6 bg-slate-900 rounded-full rotate-[10deg]"></div>
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-3 h-3 bg-pink-400 rounded-full opacity-60"></div>
    </div>
  );
};

// ==========================================
// 3. メインコンポーネント
// ==========================================
export default function Home() {
  // ----------------------------
  // 状態管理 (State Definition)
  // ----------------------------
  // 画面遷移ステータス: 'start' | 'exiting' | 'quiz'
  const [viewState, setViewState] = useState('start');

  // クイズデータ
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [scores, setScores] = useState({
    E: 0,
    I: 0,
    S: 0,
    N: 0,
    T: 0,
    F: 0,
    J: 0,
    P: 0,
  });

  // 結果データ
  const [result, setResult] = useState(null);
  const [secondaryResult, setSecondaryResult] = useState(null);

  // UI状態
  const [clickedOptionIndex, setClickedOptionIndex] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // 効果音 ON / OFF（デフォルト OFF）
  const [isSoundOn, setIsSoundOn] = useState(false);

  // 効果音
  const startSoundRef = useRef(null);
  const answerSoundRef = useRef(null);
  const resultSoundRef = useRef(null);
  const bgmSoundRef = useRef(null); // BGM 用

  // 効果音・BGMの準備
    // 効果音・BGMの準備
  useEffect(() => {
    if (typeof window !== 'undefined') {
      startSoundRef.current = new Audio('/sounds/start.mp3');
      answerSoundRef.current = new Audio('/sounds/answer.mp3');
      resultSoundRef.current = new Audio('/sounds/result.mp3');
      bgmSoundRef.current = new Audio('/sounds/bgm.mp3');

      // 効果音の音量を少し低めにする（0〜1）
      if (startSoundRef.current) {
        startSoundRef.current.volume = 0.21;  // デフォ1.0 → 0.4
      }
      if (answerSoundRef.current) {
        answerSoundRef.current.volume = 0.17; // 連打されるので少し低め
      }
      if (resultSoundRef.current) {
        resultSoundRef.current.volume = 0.17; // ちょい強めだけど控えめ
      }

      // BGM はかなり小さめにする
      if (bgmSoundRef.current) {
        bgmSoundRef.current.loop = true;
        bgmSoundRef.current.volume = 0.2; // 0.2 → 0.1 とか 0.08 でもOK
      }
    }
  }, []);

  // サウンドON/OFFに応じてBGM再生制御
  useEffect(() => {
    if (!bgmSoundRef.current) return;

    if (isSoundOn) {
      bgmSoundRef.current
        .play()
        .catch(() => {
          // モバイルでブロックされた時などは握りつぶし
        });
    } else {
      bgmSoundRef.current.pause();
      // 必要なら曲頭に戻す
      // bgmSoundRef.current.currentTime = 0;
    }
  }, [isSoundOn]);

  // ----------------------------
  // クイズデータ準備
  // ----------------------------
  useEffect(() => {
    if (!allQuestionsPool) return;

    const shuffleArray = (array) => {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    };

    // タイプごとのプールを作成
    const eiPool = allQuestionsPool.filter(
      (q) => q.options[0].type === 'E' || q.options[0].type === 'I'
    );
    const snPool = allQuestionsPool.filter(
      (q) => q.options[0].type === 'S' || q.options[0].type === 'N'
    );
    const tfPool = allQuestionsPool.filter(
      (q) => q.options[0].type === 'T' || q.options[0].type === 'F'
    );
    const jpPool = allQuestionsPool.filter(
      (q) => q.options[0].type === 'J' || q.options[0].type === 'P'
    );

    // 各プールから3問ずつ抽出
    const selectedQuestions = [
      ...shuffleArray(eiPool).slice(0, 3),
      ...shuffleArray(snPool).slice(0, 3),
      ...shuffleArray(tfPool).slice(0, 3),
      ...shuffleArray(jpPool).slice(0, 3),
    ];

    setQuizQuestions(shuffleArray(selectedQuestions));
  }, []);

  // ----------------------------
  // ハンドラ類
  // ----------------------------

  // 開始ボタン処理
  const handleStart = () => {
    // 効果音（開始）※ONのときだけ
    if (isSoundOn && startSoundRef.current) {
      startSoundRef.current.currentTime = 0;
      startSoundRef.current.play().catch(() => {});
    }
    setViewState('exiting'); // 退場アニメーション開始
  };

  // アニメーション終了検知
  const handleAnimationEnd = (e) => {
    // 退場アニメーション (exit-screen) が終わったら画面を完全に切り替え
    if (e.animationName && e.animationName.includes('exit-screen')) {
      setViewState('quiz');
    }
  };

  // 回答処理
  const handleAnswer = (type, index) => {
    // 効果音（回答）※ONのときだけ
    if (isSoundOn && answerSoundRef.current) {
      answerSoundRef.current.currentTime = 0;
      answerSoundRef.current.play().catch(() => {});
    }

    setClickedOptionIndex(index);

    setTimeout(() => {
      const newScores = { ...scores, [type]: (scores[type] || 0) + 1 };
      setScores(newScores);
      setClickedOptionIndex(null);

      if (currentQ < quizQuestions.length - 1) {
        setCurrentQ(currentQ + 1);
      } else {
        setIsCalculating(true);
        setTimeout(() => {
          calculateResult(newScores);
          setIsCalculating(false);
        }, 1800);
      }
    }, 400);
  };

  // 結果計算処理
  const calculateResult = (finalScores) => {
    const typeStr =
      (finalScores.E >= finalScores.I ? 'E' : 'I') +
      (finalScores.S >= finalScores.N ? 'S' : 'N') +
      (finalScores.T >= finalScores.F ? 'T' : 'F') +
      (finalScores.J >= finalScores.P ? 'J' : 'P');

    const mainType = yokaiTypes[typeStr] || yokaiTypes['ENTP'];
    setResult(mainType);

    // サブタイプの計算
    const diffs = [
      { axis: 0, diff: Math.abs(finalScores.E - finalScores.I), types: ['E', 'I'] },
      { axis: 1, diff: Math.abs(finalScores.S - finalScores.N), types: ['S', 'N'] },
      { axis: 2, diff: Math.abs(finalScores.T - finalScores.F), types: ['T', 'F'] },
      { axis: 3, diff: Math.abs(finalScores.J - finalScores.P), types: ['J', 'P'] },
    ];
    diffs.sort((a, b) => a.diff - b.diff);

    const closestAxisIndex = diffs[0].axis;
    const secondaryTypeChars = typeStr.split('');
    const currentWinnerChar = secondaryTypeChars[closestAxisIndex];
    const loserChar = diffs[0].types.find((t) => t !== currentWinnerChar);
    secondaryTypeChars[closestAxisIndex] = loserChar;

    const secondaryTypeStr = secondaryTypeChars.join('');
    setSecondaryResult(yokaiTypes[secondaryTypeStr]);

    // 効果音（結果表示）※ONのときだけ
    if (isSoundOn && resultSoundRef.current) {
      resultSoundRef.current.currentTime = 0;
      resultSoundRef.current.play().catch(() => {});
    }
  };

  // 結果バーコンポーネント
  const StatBar = ({
    labelLeft,
    labelRight,
    scoreLeft,
    scoreRight,
    colorLeft,
    colorRight,
  }) => {
    const total = scoreLeft + scoreRight || 1;
    const leftRatio = scoreLeft / total;
    const rightRatio = scoreRight / total;
    const leftPercent = Math.round(leftRatio * 100);
    const rightPercent = Math.round(rightRatio * 100);

    return (
      <div className="mb-8">
        <div className="flex justify-between text-xs mb-2 tracking-wider">
          <span
            className={
              scoreLeft >= scoreRight
                ? colorLeft.replace('bg-', 'text-') + ' font-bold'
                : 'text-gray-500'
            }
          >
            {labelLeft} <span className="opacity-60">({leftPercent}%)</span>
          </span>
          <span
            className={
              scoreRight > scoreLeft
                ? colorRight.replace('bg-', 'text-') + ' font-bold'
                : 'text-gray-500'
            }
          >
            <span className="opacity-60">({rightPercent}%)</span> {labelRight}
          </span>
        </div>
        <div className="relative h-3 bg-gray-900/80 rounded-full overflow-hidden flex items-center border border-gray-800/50 shadow-inner">
          <div className="absolute left-1/2 top-0 w-0.5 h-full bg-gray-700 -translate-x-1/2 z-10 opacity-50"></div>
          <div className="w-1/2 h-full flex justify-end overflow-hidden">
            <div
              style={{ width: `${leftRatio * 100}%` }}
              className={`h-full ${colorLeft} origin-right transition-all duration-1000 ease-out opacity-90 shadow-[0_0_10px_currentColor]`}
            ></div>
          </div>
          <div className="w-1/2 h-full flex justify-start overflow-hidden">
            <div
              style={{ width: `${rightRatio * 100}%` }}
              className={`h-full ${colorRight} origin-left transition-all duration-1000 ease-out opacity-90 shadow-[0_0_10px_currentColor]`}
            ></div>
          </div>
        </div>
      </div>
    );
  };

  // ローディング表示
  if (!quizQuestions || !quizQuestions.length)
    return <main className="min-h-screen bg-slate-950"></main>;

  // ----------------------------
  // レンダリング (JSX)
  // ----------------------------
  return (
    // Grid Stacking: 開始画面とメイン画面を同じセル(1,1)に重ねて配置
    <div className="grid grid-cols-1 grid-rows-1 w-full min-h-screen font-serif bg-slate-950 text-cyan-500 relative">
      {/* 背景レイヤー (全画面共通) */}
      <div className="col-start-1 row-start-1 fixed inset-0 bg-[radial-gradient(circle_at_center,#050a14_0%,#000000_100%)] -z-10"></div>
      <div className="col-start-1 row-start-1 z-0 pointer-events-none">
        <WispParticles />
      </div>

      {/* ------------------------------------------
          レイヤー1: 診断画面 (Main Quiz & Result)
         ------------------------------------------ */}
      {(viewState === 'exiting' || viewState === 'quiz') && (
        <main
          className={`
            col-start-1 row-start-1 w-full min-h-screen overflow-x-hidden flex flex-col items-center p-6
            ${!result ? 'justify-center' : 'justify-start'}
            ${viewState === 'exiting' ? 'opacity-0' : 'animate-enter-screen z-10'}
          `}
        >
          {/* 霊視中ローディングオーバーレイ */}
          {isCalculating && (
            <div className="fixed inset-0 z-50 bg-cyan-900/80 backdrop-blur-lg flex items-center justify-center animate-pulse">
              <div className="text-cyan-100 text-3xl font-bold tracking-[0.5em] animate-bounce drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]">
                霊視中...
              </div>
            </div>
          )}

          {!result ? (
            // --- クイズ進行画面 ---
            <div
              className={`max-w-md w-full my-auto transition-opacity duration-300 ${
                isCalculating ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {/* プログレスバー */}
              <div className="w-full bg-gray-900/50 h-1 mb-8 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-fuchsia-600 to-cyan-600 h-full transition-all duration-500 ease-out box-shadow-neon"
                  style={{
                    width: `${((currentQ + 1) / quizQuestions.length) * 100}%`,
                  }}
                ></div>
              </div>

              {/* 質問カード */}
              <div className="bg-gray-900/50 border border-cyan-900/30 p-8 rounded-2xl backdrop-blur-md shadow-[0_0_30px_rgba(8,145,178,0.1)]">
                <p className="text-xs text-cyan-600 mb-2 tracking-[0.2em] uppercase font-bold">
                  第 {currentQ + 1} 問{' '}
                  <span className="text-gray-600">/ 全 {quizQuestions.length} 問</span>
                </p>
                <h2 className="text-xl md:text-2xl text-gray-100 mb-10 leading-relaxed font-medium">
                  {quizQuestions[currentQ].text}
                </h2>

                {/* 選択肢 */}
                <div className="space-y-4">
                  {quizQuestions[currentQ].options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswer(option.type, index)}
                      disabled={clickedOptionIndex !== null}
                      className={`w-full py-5 px-6 text-left border rounded-xl text-gray-300 transition-all duration-200 group relative overflow-hidden flex items-center
                        ${
                          clickedOptionIndex === index
                            ? 'bg-cyan-900/60 border-cyan-400 text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.6)] scale-105'
                            : 'border-gray-800 bg-gray-950/30 hover:bg-cyan-950/30 hover:border-cyan-700 hover:text-cyan-300'
                        }
                      `}
                    >
                      <span
                        className={`inline-block w-3 h-3 rounded-full mr-5 transition-all duration-300
                          ${
                            clickedOptionIndex === index
                              ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]'
                              : 'bg-gray-700 group-hover:bg-cyan-600'
                          }`}
                      ></span>
                      <span className="relative z-10 text-lg">{option.text}</span>
                      {clickedOptionIndex === index && (
                        <span className="absolute inset-0 bg-cyan-400/20 animate-ping-slow rounded-xl"></span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // --- 結果表示画面 ---
            <div className="max-w-lg w-full text-center py-12 animate-enter-screen">
              <p className="text-fuchsia-500 tracking-[0.3em] text-xs md:text-sm mb-6 uppercase font-bold">
                あなたの深層妖怪タイプ
              </p>
              <div className="mb-8 relative inline-block">
                <div className="absolute inset-0 bg-fuchsia-600 blur-[60px] opacity-40 rounded-full animate-pulse-slow"></div>
                {/* 画像がない場合のフォールバックを表示するか、publicフォルダに画像があることを前提とする */}
                {result.img && (
                  <Image
                    src={result.img}
                    alt={result.name}
                    width={300}
                    height={300}
                    className="relative z-10 rounded-2xl border-2 border-fuchsia-500/50 shadow-[0_0_40px_rgba(232,121,249,0.5)]"
                    priority
                  />
                )}
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-gray-100 mb-3 tracking-tight">
                {result.name}
              </h1>
              <p className="text-cyan-400 text-lg md:text-xl mb-10 font-light italic tracking-wider">
                {result.title}
              </p>

              <div className="bg-gray-900/60 border border-fuchsia-900/50 p-8 rounded-2xl text-gray-300 leading-8 mb-10 text-left shadow-2xl backdrop-blur-md">
                <p>{result.desc}</p>
              </div>

              <div className="mt-16 pt-10 border-t border-gray-800/50">
                <h3 className="text-xl text-gray-200 font-bold mb-10 tracking-widest text-center uppercase">
                  霊的パラメータ分析
                </h3>
                {secondaryResult && (
                  <div className="bg-cyan-950/20 p-6 rounded-xl mb-12 text-left border border-cyan-900/30 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                    <p className="text-cyan-400 text-sm mb-2 font-bold tracking-wider uppercase">
                      ⚠️ 潜伏する別の影
                    </p>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      あなたの魂は
                      <span className="text-fuchsia-300 font-bold">{result.name}</span>
                      が支配的ですが、 深層には
                      <span className="text-cyan-300 font-bold">
                        {secondaryResult.name}
                      </span>
                      の性質も強く潜伏しています。
                    </p>
                  </div>
                )}

                <div className="space-y-6 px-2">
                  <StatBar
                    labelLeft="外向性"
                    labelRight="内向性"
                    scoreLeft={scores.E}
                    scoreRight={scores.I}
                    colorLeft="bg-fuchsia-500"
                    colorRight="bg-cyan-500"
                  />
                  <StatBar
                    labelLeft="感覚的"
                    labelRight="直観的"
                    scoreLeft={scores.S}
                    scoreRight={scores.N}
                    colorLeft="bg-fuchsia-500"
                    colorRight="bg-cyan-500"
                  />
                  <StatBar
                    labelLeft="論理重視"
                    labelRight="感情重視"
                    scoreLeft={scores.T}
                    scoreRight={scores.F}
                    colorLeft="bg-fuchsia-500"
                    colorRight="bg-cyan-500"
                  />
                  <StatBar
                    labelLeft="計画的"
                    labelRight="柔軟的"
                    scoreLeft={scores.J}
                    scoreRight={scores.P}
                    colorLeft="bg-fuchsia-500"
                    colorRight="bg-cyan-500"
                  />
                </div>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="mt-16 px-10 py-4 bg-gray-900/50 border-2 border-gray-700 text-gray-300 hover:text-white hover:border-cyan-400 hover:bg-cyan-950/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all rounded-full text-sm tracking-[0.25em] uppercase font-bold"
              >
                もう一度診断する
              </button>
            </div>
          )}
        </main>
      )}

      {/* ------------------------------------------
          レイヤー2: 開始画面 (Start Screen)
         ------------------------------------------ */}
      {viewState !== 'quiz' && (
        <section
          className={`
            col-start-1 row-start-1 z-20 flex flex-col items-center justify-center w-full min-h-screen bg-slate-950/90 backdrop-blur-sm
            ${viewState === 'exiting' ? 'animate-exit-screen pointer-events-none' : ''}
          `}
          onAnimationEnd={handleAnimationEnd}
        >
          {/* ゴーストキャラクター */}
          <div className="mb-12 scale-125">
            <GhostCharacter />
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-t from-gray-400 to白 mb-6 tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            妖怪心理診断
          </h1>
          <p className="text-cyan-400 text-lg md:text-xl tracking-[0.5em] font-light mb-16 opacity-80">
            あなたの魂の正体
          </p>

          <button
            onClick={handleStart}
            className="group relative px-12 py-5 bg-transparent border border-cyan-500/50 text-cyan-300 font-bold text-xl tracking-[0.2em] rounded-full overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(34,211,238,0.4)] hover:border-cyan-400 hover:text-white"
          >
            <span className="relative z-10">診断開始</span>
            <div className="absolute inset-0 bg-cyan-500/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
          </button>
        </section>
      )}

      {/* ------------------------------------------
          効果音 ON/OFF トグルボタン（右下）
         ------------------------------------------ */}
      <button
        onClick={() => setIsSoundOn((prev) => !prev)}
        className={`
          fixed bottom-4 right-4 z-40 px-4 py-2 rounded-full border text-xs md:text-sm
          bg-slate-950/80 backdrop-blur-md flex items-center gap-2
          transition-all duration-200
          ${isSoundOn ? 'border-cyan-400 text-cyan-200' : 'border-gray-600 text-gray-400'}
        `}
      >
        <span className="text-lg">{isSoundOn ? '📣' : '🔇'}</span>
        <span>{isSoundOn ? '効果音 ON' : '効果音 OFF'}</span>
      </button>
    </div>
  );
}
