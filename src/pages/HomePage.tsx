import { useEffect, useState } from "react";
import HomeContent from "../components/HomeComponents/HomeContent";
import OnboardingModal from "../components/OnboardingComponents/OnboardingFirst";
import { db } from "../utils/firebaseSetup";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { useAuthUser } from "../utils/firebaseSetup";
import { useDomains } from "../hooks/useDomains";
import { useChatHistory } from "../hooks/useChatHistory";
import HomeTour from "../components/OnboardingComponents/HomeTour";

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

      // 🔹 Ambil semua koleksi penting dari Firestore
      const domainSnap = await getDocs(
        collection(db, "users", user.uid, "domains")
      );
      const chatSnap = await getDocs(
        collection(db, "users", user.uid, "chats")
      );
      const dashboardSnap = await getDocs(
        collection(db, "users", user.uid, "dashboards")
      );
      const datasetSnap = await getDocs(
        collection(db, "users", user.uid, "datasets")
      );

      // 🔹 User benar-benar baru kalau semua koleksi kosong
      const isNewUser =
        domainSnap.empty &&
        chatSnap.empty &&
        dashboardSnap.empty &&
        datasetSnap.empty;

      // 🔹 Ganti blok penentuan step
      const needOnboarding = !data.hasSeenOnboarding && isNewUser;

      // 🔹 Ubah jadi seperti ini:
      const needHomeTour =
        data.hasSeenConfigHint && !data.hasSeenHomeTour && !needOnboarding;

      if (needOnboarding) {
        setShowOnboarding(true);
      } else if (needHomeTour) {
        setShowTour(true);
      }
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
      {showTour && <HomeTour onFinish={handleFinishTour} />}
      <HomeContent />
    </div>
  );
}
