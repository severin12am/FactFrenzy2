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

  const shareUrl = 'https://factfrenzy.info';

  useEffect(() => {
    const trueFacts = facts.filter(f => f.isTrue);
    const falseFacts = facts.filter(f => !f.isTrue);
    const selectedTrue = trueFacts.sort(() => Math.random() - 0.5).slice(0, facts.length / 2);
    const selectedFalse = falseFacts.sort(() => Math.random() - 0.5).slice(0, facts.length / 2);
    const shuffled = [...selectedTrue, ...selectedFalse].sort(() => Math.random() - 0.5);
    setShuffledFacts(shuffled);
  }, []);

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

  const handleGuess = useCallback((guess: boolean) => {
    if (gameOver || isAnswered) return;

    const isCorrect = guess === shuffledFacts[currentFactIndex].isTrue;
    setLastAnswerCorrect(isCorrect);
    setIsAnswered(true);

    if (isCorrect) {
      setTimeout(() => {
        setScore((prev) => prev + 1);
        if (currentFactIndex >= shuffledFacts.length - 2) {
          const trueFacts = facts.filter(f => f.isTrue);
          const falseFacts = facts.filter(f => !f.isTrue);
          const selectedTrue = trueFacts.sort(() => Math.random() - 0.5).slice(0, facts.length / 2);
          const selectedFalse = falseFacts.sort(() => Math.random() - 0.5).slice(0, facts.length / 2);
          setShuffledFacts([...selectedTrue, ...selectedFalse].sort(() => Math.random() - 0.5));
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

  const resetGame = useCallback(() => {
    const trueFacts = facts.filter(f => f.isTrue);
    const falseFacts = facts.filter(f => !f.isTrue);
    const selectedTrue = trueFacts.sort(() => Math.random() - 0.5).slice(0, facts.length / 2);
    const selectedFalse = falseFacts.sort(() => Math.random() - 0.5).slice(0, facts.length / 2);
    setShuffledFacts([...selectedTrue, ...selectedFalse].sort(() => Math.random() - 0.5));
    setCurrentFactIndex(0);
    setScore(0);
    setTimeLeft(7);
    setGameOver(false);
    setIsAnswered(false);
    setLastAnswerCorrect(null);
    setLastIncorrectFact(null);
    setNameInput('');
  }, []);

  const handleCopy = () => {
    const text = lastIncorrectFact
      ? `🤔 Did you know that "${lastIncorrectFact.statement}" was ${lastIncorrectFact.isTrue ? 'true' : 'false'}? I scored ${score} points on FactFrenzy.info! Think you know more facts than me? 🧠`
      : `🎉 I scored ${score} points on FactFrenzy.info! Think you know more facts than me? Try now! 🧠`;
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

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
            className="flex items-center gap-2 text-white hover:text-yellow-300 transition-colors text-base sm:text-lg"
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

          <div className={`bg-white rounded-xl shadow-2xl p-3 sm:p-6 ${showLeaderboard ? 'col-span-1 sm:col-span-2' : 'col-span-1 sm:col-span-3'}`}>
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
                <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4">Game Over!</h2>
                <p className="text-xl sm:text-2xl mb-4 sm:mb-6">Final Score: {score}</p>
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                  <button
                    onClick={resetGame}
                    className="bg-indigo-600 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-base sm:text-lg"
                  >
                    Play Again
                  </button>
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={handleCopy}
                      className={`bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 sm:gap-3 ${copySuccess ? 'bg-green-700' : ''}`}
                    >
                      <Share2 className="w-5 sm:w-6 h-5 sm:h-6" />
                      {copySuccess ? 'Copied!' : 'Share'}
                    </button>

                    <TwitterShareButton
                      url={shareUrl}
                      title={shareText}
                      className="bg-blue-400 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-blue-500 transition-colors flex items-center"
                    >
                      <TwitterIcon size={24} sm:size={32} round={true} />
                    </TwitterShareButton>

                    <WhatsappShareButton
                      url={shareUrl}
                      title={shareText}
                      separator=" "
                      className="bg-green-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors flex items-center"
                    >
                      <WhatsappIcon size={24} sm:size={32} round={true} />
                    </WhatsappShareButton>

                    <FacebookShareButton
                      url={shareUrl}
                      quote={shareText}
                      className="bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors flex items-center"
                    >
                      <FacebookIcon size={24} sm:size={32} round={true} />
                    </FacebookShareButton>
                  </div>
                  <div className="mt-3 sm:mt-4 flex flex-col items-center gap-2 sm:gap-3">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Enter your name"
                      className="border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 w-full max-w-md text-base sm:text-lg"
                    />
                    <button
                      onClick={() => updateLeaderboard(nameInput)}
                      className="bg-yellow-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-colors text-base sm:text-lg"
                    >
                      Add to Leaderboard
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
                    link
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <button
                    onClick={() => handleGuess(false)}
                    disabled={isAnswered}
                    className={`p-3 sm:p-4 text-base sm:text-xl font-semibold rounded-lg transition-colors ${
                      isAnswered
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    False
                  </button>
                  <button
                    onClick={() => handleGuess(true)}
                    disabled={isAnswered}
                    className={`p-3 sm:p-4 text-base sm:text-xl font-semibold rounded-lg transition-colors ${
                      isAnswered
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    True
                  </button>
                </div>

                {lastAnswerCorrect !== null && (
                  <div className={`mt-2 sm:mt-4 text-center font-semibold text-base sm:text-lg ${
                    lastAnswerCorrect ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {lastAnswerCorrect ? 'Correct!' : 'Wrong!'}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
