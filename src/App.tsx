import React, { useState, useEffect, useCallback, useRef } from 'react';
import { facts } from './data/facts';
import { Timer, Trophy, Brain, Crown, Share2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import {
  TwitterShareButton,
  WhatsappShareButton,
  FacebookShareButton,
} from 'react-share';
import { TwitterIcon, WhatsappIcon, FacebookIcon } from 'react-share';

function App() {
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(7);
  const [gameOver, setGameOver] = useState(false);
  const [shuffledFacts, setShuffledFacts] = useState<typeof facts>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [leaderboard, setLeaderboard] = useState<{ nickname: string; score: number }[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [lastIncorrectFact, setLastIncorrectFact] = useState<{ statement: string; isTrue: boolean } | null>(null);
  const [nameInput, setNameInput] = useState('');
  const leaderboardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const mainPanelRef = useRef<HTMLDivElement>(null);

  const shareUrl = 'https://factfrenzy.info';

  // Fisher-Yates shuffle function
  const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Random fact selection per category (using keyword-based filtering)
  const getRandomFacts = (categoryFacts: typeof facts, count: number) => {
    const shuffled = shuffleArray(categoryFacts);
    const result: typeof facts = [];
    for (let i = 0; i < shuffled.length && result.length < count; i++) {
      if (Math.random() < 0.5) { // 50% chance to include each fact
        result.push(shuffled[i]);
      }
    }
    return result;
  };

  // Initialize shuffled facts with category-based filtering
  useEffect(() => {
    const categories = {
      science: facts.filter(f => f.statement.includes("universe") || f.statement.includes("Earth") || f.statement.includes("water")),
      animals: facts.filter(f => f.statement.includes("body") || f.statement.includes("bird") || f.statement.includes("snake")),
      history: facts.filter(f => f.statement.includes("ancient") || f.statement.includes("war") || f.statement.includes("king")),
      geography: facts.filter(f => f.statement.includes("mountain") || f.statement.includes("desert") || f.statement.includes("ocean")),
      technology: facts.filter(f => f.statement.includes("computer") || f.statement.includes("radio") || f.statement.includes("phone"))
    };

    const targetPerCategory = 100; // Aim for ~100 per category
    const selectedFacts = [
      ...getRandomFacts(categories.science, targetPerCategory),
      ...getRandomFacts(categories.animals, targetPerCategory),
      ...getRandomFacts(categories.history, targetPerCategory),
      ...getRandomFacts(categories.geography, targetPerCategory),
      ...getRandomFacts(categories.technology, targetPerCategory),
    ];

    setShuffledFacts(shuffleArray(selectedFacts));
  }, []);

  // Timer logic
  useEffect(() => {
    if (gameOver || isAnswered) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameOver(true);
          fetchLeaderboard();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentFactIndex, gameOver, isAnswered]);

  // Leaderboard functions
  const updateLeaderboard = async (nickname: string) => {
    if (!nickname) return;
    const { data: existing } = await supabase
      .from('leaderboard')
      .select('score')
      .eq('nickname', nickname)
      .single();

    if (!existing || score > existing.score) {
      await supabase
        .from('leaderboard')
        .upsert({ nickname, score }, { onConflict: 'nickname' });
    }
    fetchLeaderboard();
    setShowLeaderboard(true);
    setTimeout(() => {
      const userEntry = leaderboardRefs.current[nickname];
      if (userEntry) {
        userEntry.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('leaderboard')
      .select('nickname, score')
      .order('score', { ascending: false })
      .limit(10);
    if (data) {
      setLeaderboard(data);
    } else {
      setLeaderboard([]);
    }
  };

  // Handle user guess
  const handleGuess = useCallback((guess: boolean) => {
    if (gameOver || isAnswered) return;

    const isCorrect = guess === shuffledFacts[currentFactIndex].isTrue;
    setLastAnswerCorrect(isCorrect);
    setIsAnswered(true);

    if (isCorrect) {
      setTimeout(() => {
        setScore((prev) => prev + 1);
        if (currentFactIndex >= shuffledFacts.length - 2) {
          const categories = {
            science: facts.filter(f => f.statement.includes("universe") || f.statement.includes("Earth") || f.statement.includes("water")),
            animals: facts.filter(f => f.statement.includes("body") || f.statement.includes("bird") || f.statement.includes("snake")),
            history: facts.filter(f => f.statement.includes("ancient") || f.statement.includes("war") || f.statement.includes("king")),
            geography: facts.filter(f => f.statement.includes("mountain") || f.statement.includes("desert") || f.statement.includes("ocean")),
            technology: facts.filter(f => f.statement.includes("computer") || f.statement.includes("radio") || f.statement.includes("phone"))
          };
          const targetPerCategory = 100;
          const selectedFacts = [
            ...getRandomFacts(categories.science, targetPerCategory),
            ...getRandomFacts(categories.animals, targetPerCategory),
            ...getRandomFacts(categories.history, targetPerCategory),
            ...getRandomFacts(categories.geography, targetPerCategory),
            ...getRandomFacts(categories.technology, targetPerCategory),
          ];
          setShuffledFacts(shuffleArray(selectedFacts));
          setCurrentFactIndex(0);
        } else {
          setCurrentFactIndex((prev) => prev + 1);
        }
        setTimeLeft(7);
        setIsAnswered(false);
        setLastAnswerCorrect(null);
      }, 1000);
    } else {
      setLastIncorrectFact({
        statement: shuffledFacts[currentFactIndex].statement,
        isTrue: shuffledFacts[currentFactIndex].isTrue,
      });
      setGameOver(true);
      fetchLeaderboard();
    }
  }, [currentFactIndex, gameOver, isAnswered, shuffledFacts]);

  // Reset game
  const resetGame = useCallback(() => {
    const categories = {
      science: facts.filter(f => f.statement.includes("universe") || f.statement.includes("Earth") || f.statement.includes("water")),
      animals: facts.filter(f => f.statement.includes("body") || f.statement.includes("bird") || f.statement.includes("snake")),
      history: facts.filter(f => f.statement.includes("ancient") || f.statement.includes("war") || f.statement.includes("king")),
      geography: facts.filter(f => f.statement.includes("mountain") || f.statement.includes("desert") || f.statement.includes("ocean")),
      technology: facts.filter(f => f.statement.includes("computer") || f.statement.includes("radio") || f.statement.includes("phone"))
    };

    const shuffleArray = (array: any[]) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    const getRandomFacts = (categoryFacts: typeof facts, count: number) => {
      const shuffled = shuffleArray(categoryFacts);
      const result: typeof facts = [];
      for (let i = 0; i < shuffled.length && result.length < count; i++) {
        if (Math.random() < 0.5) {
          result.push(shuffled[i]);
        }
      }
      return result;
    };

    const targetPerCategory = 100;
    const selectedFacts = [
      ...getRandomFacts(categories.science, targetPerCategory),
      ...getRandomFacts(categories.animals, targetPerCategory),
      ...getRandomFacts(categories.history, targetPerCategory),
      ...getRandomFacts(categories.geography, targetPerCategory),
      ...getRandomFacts(categories.technology, targetPerCategory),
    ];

    setShuffledFacts(shuffleArray(selectedFacts));
    setCurrentFactIndex(0);
    setScore(0);
    setTimeLeft(7);
    setGameOver(false);
    setIsAnswered(false);
    setLastAnswerCorrect(null);
    setLastIncorrectFact(null);
    setNameInput('');
  }, []);

  // Copy to clipboard
  const handleCopy = () => {
    const text = lastIncorrectFact
      ? `🤔 Did you know that "${lastIncorrectFact.statement}" was ${lastIncorrectFact.isTrue ? 'true' : 'false'}? I scored ${score} points on FactFrenzy.info! Think you know more facts than me? 🧠`
      : `🎉 I scored ${score} points on FactFrenzy.info! Think you know more facts than me? Try now! 🧠`;
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Google search link
  const getGoogleSearchLink = (statement: string) => {
    const encodedStatement = encodeURIComponent(statement);
    return `https://www.google.com/search?q=${encodedStatement}`;
  };

  const currentFact = shuffledFacts[currentFactIndex];
  if (!currentFact) return null;

  const shareText = lastIncorrectFact
    ? `🤔 Did you know that "${lastIncorrectFact.statement}" was ${lastIncorrectFact.isTrue ? 'true' : 'false'}? I scored ${score} points! Think you know more facts than me? 🧠`
    : `🎉 I scored ${score} points! Think you know more facts than me? Try now! 🧠`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6 sm:mb-8 bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4">
          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="keyboard-button keyboard-button-primary flex items-center gap-2"
          >
            <Crown className="w-6 sm:w-8 h-6 sm:h-8" />
            <span>Leaderboard</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          {showLeaderboard && (
            <div className="bg-white rounded-xl shadow-2xl p-3 sm:p-6 col-span-1">
              <h2 className="text-xl sm:text-3xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <Crown className="w-6 sm:w-8 h-6 sm:h-8 text-yellow-500" />
                Top Players
              </h2>
              <div className="space-y-2 sm:space-y-3">
                {leaderboard.length > 0 ? (
                  leaderboard.map((entry, index) => (
                    <div
                      key={entry.nickname}
                      ref={(el) => (leaderboardRefs.current[entry.nickname] = el)}
                      className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded text-base sm:text-lg"
                    >
                      <span className="font-semibold">#{index + 1} {entry.nickname}</span>
                      <span className="text-indigo-600">{entry.score}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-base sm:text-lg">No entries yet. Be the first!</p>
                )}
              </div>
            </div>
          )}

          <div
            ref={mainPanelRef}
            className={`bg-white rounded-xl shadow-2xl p-3 sm:p-6 ${showLeaderboard ? 'col-span-1 sm:col-span-2' : 'col-span-1 sm:col-span-3'}`}
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <Trophy className="w-6 sm:w-8 h-6 sm:h-8 text-yellow-500" />
                <span className="text-xl sm:text-3xl font-bold">Score: {score}</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <Timer className="w-6 sm:w-8 h-6 sm:h-8 text-red-500" />
                <span className="text-xl sm:text-3xl font-bold">{timeLeft}s</span>
              </div>
            </div>

            {gameOver ? (
              <div className="text-center">
                <div className="w-full max-w-md mx-auto mb-3 sm:mb-4">
                  <div className="flex justify-center items-center gap-2 text-2xl sm:text-4xl font-bold">
                    <h2>Game Over!</h2>
                    <p>Final Score: {score}</p>
                  </div>
                </div>
                {lastIncorrectFact && (
                  <div className="w-full max-w-md mx-auto mb-4 sm:mb-6">
                    <p className="text-lg sm:text-xl leading-relaxed text-gray-700">
                      Last Fact: {lastIncorrectFact.statement}
                    </p>
                    <div className="flex justify-center items-center gap-2 text-lg sm:text-xl leading-relaxed">
                      <p className="text-gray-500">
                        (This fact was {lastIncorrectFact.isTrue ? 'true' : 'false'})
                      </p>
                      <a
                        href={getGoogleSearchLink(lastIncorrectFact.statement)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Learn More
                      </a>
                    </div>
                  </div>
                )}
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                  <div className="w-full max-w-md">
                    <button
                      onClick={resetGame}
                      className="keyboard-button keyboard-button-primary w-full text-base sm:text-lg"
                    >
                      Play Again
                    </button>
                  </div>
                  <div className="w-full max-w-md">
                    <div className="flex gap-2 sm:gap-3">
                      <button
                        onClick={handleCopy}
                        className={`keyboard-button keyboard-button-success flex-1 flex items-center justify-center gap-2 sm:gap-3 ${copySuccess ? 'opacity-75' : ''}`}
                      >
                        <Share2 className="w-5 sm:w-6 h-5 sm:h-6" />
                        {copySuccess ? 'Copied!' : 'Share'}
                      </button>
                      <TwitterShareButton
                        url={shareUrl}
                        title={shareText}
                        className="keyboard-button keyboard-button-primary flex-1 flex items-center justify-center"
                      >
                        <TwitterIcon size={24} round={true} />
                      </TwitterShareButton>
                      <WhatsappShareButton
                        url={shareUrl}
                        title={shareText}
                        separator=" "
                        className="keyboard-button keyboard-button-primary flex-1 flex items-center justify-center"
                      >
                        <WhatsappIcon size={24} round={true} />
                      </WhatsappShareButton>
                      <FacebookShareButton
                        url={shareUrl}
                        quote={shareText}
                        className="keyboard-button keyboard-button-primary flex-1 flex items-center justify-center"
                      >
                        <FacebookIcon size={24} round={true} />
                      </FacebookShareButton>
                    </div>
                  </div>
                  <div className="w-full max-w-md mt-3 sm:mt-4 flex flex-col items-center gap-2 sm:gap-3">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full max-w-md border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-base sm:text-lg"
                    />
                    <button
                      onClick={() => updateLeaderboard(nameInput)}
                      className="keyboard-button keyboard-button-primary w-full max-w-md text-base sm:text-lg"
                    >
                      Add me to Leaderboard
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                    <Brain className="w-6 sm:w-8 h-6 sm:h-8 text-purple-500" />
                    <h2 className="text-xl sm:text-2xl font-semibold">Fact #{score + 1}</h2>
                  </div>
                  <p className="text-lg sm:text-xl leading-relaxed">{currentFact.statement}</p>
                  <a
                    href={getGoogleSearchLink(currentFact.statement)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 underline text-base sm:text-lg mt-1 sm:mt-2 inline-block"
                  >
                    Learn More
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <button
                    onClick={() => handleGuess(false)}
                    disabled={isAnswered}
                    className={`keyboard-button keyboard-button-danger p-3 sm:p-4 text-base sm:text-xl font-semibold ${
                      isAnswered ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    False
                  </button>
                  <button
                    onClick={() => handleGuess(true)}
                    disabled={isAnswered}
                    className={`keyboard-button keyboard-button-success p-3 sm:p-4 text-base sm:text-xl font-semibold ${
                      isAnswered ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    True
                  </button>
                </div>

                {lastAnswerCorrect !== null && (
                  <div
                    className={`mt-2 sm:mt-4 text-center font-semibold text-base sm:text-lg ${
                      lastAnswerCorrect ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {lastAnswerCorrect ? 'Correct!' : 'Wrong!'}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div
          className={`bg-gray-200 rounded-xl shadow-2xl p-3 sm:p-6 mt-6 sm:mt-8 ${
            showLeaderboard ? 'col-span-1 sm:col-span-3' : 'col-span-1 sm:col-span-3'
          }`}
          style={{
            width: mainPanelRef.current ? `${mainPanelRef.current.offsetWidth}px` : '100%',
            height: mainPanelRef.current ? `${mainPanelRef.current.offsetHeight / 2}px` : 'auto',
            minHeight: '150px',
          }}
        >
          <p className="text-center text-gray-500 text-base sm:text-lg">
            Ad Space (Placeholder)
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
