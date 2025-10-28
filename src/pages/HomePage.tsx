import { useEffect, useState } from "react";
import HomeContent from "../components/HomeComponents/HomeContent";
import OnboardingModal from "../components/OnboardingComponents/OnboardingFirst";
import { db } from "../utils/firebaseSetup";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useAuthUser } from "../utils/firebaseSetup";
import { useDomains } from "../hooks/useDomains";
import { useChatHistory } from "../hooks/useChatHistory";
import HomeTour from "../components/OnboardingComponents/HomeTour"; // 🔹 komponen tour baru

export default function HomePage() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const { user } = useAuthUser();
  const { domains } = useDomains({ seedDefaultOnEmpty: false });
  const { all: allChats } = useChatHistory();

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return;
      const data = snap.data();

      const isNewUser =
        !data.hasSeenOnboarding &&
        domains.length === 0 &&
        allChats.length === 0;

      const needTour = data.hasSeenConfigHint && !data.hasSeenHomeTour;

      if (isNewUser) setShowOnboarding(true);
      else if (needTour) setShowTour(true);
    };

    void checkUserStatus();
  }, [user, domains, allChats]);

  const handleFinishOnboarding = async () => {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { hasSeenOnboarding: true });
    }
    setShowOnboarding(false);
  };

  const handleFinishTour = async () => {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { hasSeenHomeTour: true });
    }
    setShowTour(false);
  };

  return (
    <div className="bg-[#1A1B1E] text-gray-200 min-h-screen flex flex-col items-center justify-center transition-all duration-300 ease-in-out mr-50 relative">
      {showOnboarding && <OnboardingModal onFinish={handleFinishOnboarding} />}
      {showTour && <HomeTour onFinish={handleFinishTour} />} {/* 🔹 */}
      <HomeContent />
    </div>
  );
}
