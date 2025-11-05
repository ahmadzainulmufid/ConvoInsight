//src/Pages/ConfigurationUserPage.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useAuthUser } from "../utils/firebaseSetup";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  limit,
  getDoc,
} from "firebase/firestore";
import { db } from "../utils/firebaseSetup";
import { useNavigate } from "react-router-dom";

type ProviderKey = string;

type ValidationResponse = {
  valid: boolean;
  provider: string;
  models?: string[];
  token?: string;
  error?: string;
  detail?: string;
};

type ProviderItem = {
  id: string;
  provider: string;
  models: string[];
  is_active?: boolean;
  updated_at?: string;
};

type InstructionItem = {
  id: string;
  text: string;
  is_active: boolean;
};

type UserConfig = {
  provider: string;
  token: string | null;
  models: string[];
  selectedModel: string;
  verbosity: string;
  reasoning: string;
  seed: number;
};

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://convoinsight-be-flask-32684464346.asia-southeast2.run.app";

export default function ConfigurationUserPage() {
  const { user, loading: authLoading } = useAuthUser();
  const userId = user?.uid || null;

  const [provider, setProvider] = useState<ProviderKey | "">("");
  const [apiKey, setApiKey] = useState("");
  const [validated, setValidated] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [loading, setLoading] = useState(false);

  const [verbosity, setVerbosity] = useState("medium");
  const [reasoning, setReasoning] = useState("medium");
  const [seed, setSeed] = useState<number>(0);

  const [history, setHistory] = useState<ProviderItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateProvider, setUpdateProvider] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState("");
  const [updating, setUpdating] = useState(false);

  const navigate = useNavigate();

  // New states for managing a single global instruction
  const [instruction, setInstruction] = useState("");
  const [globalInstruction, setGlobalInstruction] =
    useState<InstructionItem | null>(null);
  const [isEditingInstruction, setIsEditingInstruction] = useState(false);
  const [instructionLoading, setInstructionLoading] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [providerList, setProviderList] = useState<string[]>([]);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [activeConfig, setActiveConfig] = useState<UserConfig | null>(null);
  const [isConfigSaved, setIsConfigSaved] = useState(false);

  // 🟣 bagian atas tetap seperti ini
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    const checkHint = async () => {
      if (!user) return;

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data();

      // // ambil semua koleksi penting
      // const domainSnap = await getDocs(
      //   collection(db, "users", user.uid, "domains")
      // );
      // const chatSnap = await getDocs(
      //   collection(db, "users", user.uid, "chats")
      // );
      // const dashboardSnap = await getDocs(
      //   collection(db, "users", user.uid, "dashboards")
      // );
      // const datasetSnap = await getDocs(
      //   collection(db, "users", user.uid, "datasets")
      // );

      // // user benar-benar baru kalau belum punya data apa pun
      // const isNewUser =
      //   domainSnap.empty &&
      //   chatSnap.empty &&
      //   dashboardSnap.empty &&
      //   datasetSnap.empty;

      // tampilkan hint hanya kalau belum pernah lihat dan masih user baru
      if (!data.hasSeenConfigHint) {
        setShowHint(true);
      }
    };

    void checkHint();
  }, [user]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    // Reset dulu
    el.style.height = "auto";

    // Hitung tinggi sesuai konten
    const newHeight = el.scrollHeight;
    el.style.height = `${newHeight}px`;

    // Hilangkan scrollbar
    el.style.overflowY = "hidden";
  }, [
    instruction,
    isEditingInstruction,
    instructionLoading,
    globalInstruction,
  ]);

  useEffect(() => {
    (async () => {
      const tryFetch = async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed ${url}`);
        return res.json();
      };

      let provs: string[] = [];
      try {
        const a = await tryFetch(`${API_BASE}/litellm/providers`);
        provs = a?.providers ?? [];
      } catch (err) {
        console.debug("registry fallback #1 (/litellm/providers) failed:", err);
      }

      if (!provs?.length) {
        try {
          const b = await tryFetch(`${API_BASE}/llm/registry`);
          provs = b?.providers ?? Object.keys(b?.groups ?? {});
        } catch (err) {
          console.debug("registry fallback #2 (/llm/registry) failed:", err);
        }
      }

      if (!provs?.length) {
        try {
          const c = await tryFetch(`${API_BASE}/litellm/models`);
          provs = Object.keys(c?.groups ?? {});
        } catch (err) {
          console.debug("registry fallback #3 (/litellm/models) failed:", err);
        }
      }

      if (!provs?.length) {
        toast.error("Failed to load provider list");
      } else {
        setProviderList([...new Set(provs)].sort());
      }
    })();
  }, []);

  // --- Fetch History ---
  const fetchHistory = useCallback(async () => {
    if (!userId) return;
    try {
      setLoadingHistory(true);

      const res = await fetch(`${API_BASE}/get-provider-keys?userId=${userId}`);
      if (!res.ok) {
        setHistory([]);
        return;
      }

      const data = await res.json();
      setHistory(Array.isArray(data.items) ? data.items : []);
      console.log("Summary:", data.summary);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load history");
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [userId]);

  // --- Fetch Global Instruction ---
  const fetchInstructions = useCallback(async () => {
    if (!userId) return;
    setInstructionLoading(true);
    try {
      const ref = collection(db, "users", userId, "instructions");
      const q = query(ref, limit(1));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = {
          id: doc.id,
          text: doc.data().text,
          is_active: doc.data().is_active ?? false,
        };
        setGlobalInstruction(data);
        setInstruction(data.text);
        setIsEditingInstruction(false);
      } else {
        setGlobalInstruction(null);
        setInstruction("");
        setIsEditingInstruction(true); // Allow user to create first instruction
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load global instruction");
    } finally {
      setInstructionLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!authLoading && userId) {
      // 🟢 ADDED: Load active config from localStorage
      const storedConfig = localStorage.getItem("user_config");
      if (storedConfig) {
        const config = JSON.parse(storedConfig);
        setActiveConfig(config);
        setProvider(config.provider); // Set provider dropdown to active
        setIsConfigSaved(true); // 🟢 ADDED: Hide form if already configured
      }

      // 🟢 Skip loading history kalau user baru
      const checkIfNewUser = async () => {
        const snap = await getDocs(collection(db, "users", userId, "domains"));
        if (snap.empty) {
          setHistory([]); // kosong aja tanpa loading
        } else {
          fetchHistory();
        }
        fetchInstructions();
      };
      void checkIfNewUser();
    }
  }, [authLoading, userId, fetchHistory, fetchInstructions]);

  // --- Validate Key ---
  const handleValidate = async () => {
    if (!userId) {
      toast.error("Not logged in yet, please log in first");
      return;
    }
    if (!provider || !apiKey) {
      toast.error("Select the provider and enter the API Key first!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/validate-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, userId }),
      });

      const data: ValidationResponse = await res.json();

      if (data.valid) {
        toast.success("API Key valid");
        setValidated(true);
        setModels(data.models ?? []);
        if (data.token) {
          setTempToken(data.token); // 🟢 ADDED: Save token to state
        }
        // fetchHistory(); // 🔴 REMOVED: Don't fetch history here

        // 🔴 REMOVED: Don't save to localStorage here
        // localStorage.setItem(
        //   "user_config",
        //   JSON.stringify({
        //     provider,
        //     token: data.token,
        //     models: data.models ?? [],
        //   })
        // );
      } else {
        toast.error(
          `API Key no validation (${data.error ?? data.detail ?? "Unknown"})`
        );
        setValidated(false);
        setModels([]);
        setTempToken(null); // 🟢 ADDED: Clear token on fail
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred during validation");
    } finally {
      setLoading(false);
    }
  };

  // --- Handle Instruction Save/Update ---
  const handleSaveInstruction = async () => {
    if (!instruction.trim()) {
      toast.error("Instructions cannot be empty!");
      return;
    }
    if (!userId) {
      toast.error("User not logged in!");
      return;
    }

    try {
      if (globalInstruction) {
        // Update existing instruction
        const docRef = doc(
          db,
          "users",
          userId,
          "instructions",
          globalInstruction.id
        );
        await updateDoc(docRef, {
          text: instruction.trim(),
          updated_at: serverTimestamp(),
        });
        toast.success("Instruction updated successfully");
      } else {
        // Create new instruction
        const ref = collection(db, "users", userId, "instructions");
        await addDoc(ref, {
          text: instruction.trim(),
          is_active: true, // Active by default
          created_at: serverTimestamp(),
        });
        toast.success("Instruction saved successfully");
      }
      fetchInstructions(); // Refetch to update state and exit edit mode
    } catch (e) {
      console.error(e);
      toast.error("Failed to save instruction");
    }
  };

  // --- Handle Instruction Activation/Deactivation ---
  const handleToggleInstructionActive = async (newStatus: boolean) => {
    if (!userId || !globalInstruction) return;

    try {
      const docRef = doc(
        db,
        "users",
        userId,
        "instructions",
        globalInstruction.id
      );
      await updateDoc(docRef, { is_active: newStatus });
      toast.success(`Instruction ${newStatus ? "activated" : "deactivated"}`);
      fetchInstructions(); // Refetch to update button state
    } catch (e) {
      console.error(e);
      toast.error("Failed to update instruction status");
    }
  };

  // --- Save Config ---
  const handleSave = () => {
    if (!provider || !validated || !selectedModel) {
      toast.error("Complete all steps first!");
      return;
    }

    // 🟢 ADDED: Check if tempToken exists from validation step
    if (!tempToken) {
      toast.error(
        "Validation token is missing. Please re-validate your API key."
      );
      return;
    }

    // 🔴 REMOVED: Old way of merging configs
    // const config = JSON.parse(localStorage.getItem("user_config") || "{}");

    // 🟢 ADDED: Create full config from scratch
    const newConfig = {
      // ...config, // 🔴 REMOVED
      provider, // 🟢 ADDED
      token: tempToken, // 🟢 ADDED
      models: models, // 🟢 ADDED (list of all available models)
      selectedModel,
      verbosity,
      reasoning,
      seed,
    };
    localStorage.setItem("user_config", JSON.stringify(newConfig));
    setActiveConfig(newConfig);
    setIsConfigSaved(true);

    toast.success("Configuration saved");

    // 🟢 ADDED: Fetch history only AFTER saving config
    fetchHistory();
  };

  const clearActiveConfig = () => {
    localStorage.removeItem("user_config");
    setActiveConfig(null);
    setIsConfigSaved(false);
    setProvider("");
    setApiKey("");
    setValidated(false);
    setModels([]);
    setSelectedModel("");
    setTempToken(null);
  };

  const handleUpdate = (prov: string) => {
    setUpdateProvider(prov);
    setShowUpdateModal(true);
    setNewApiKey("");
  };

  const submitUpdate = async () => {
    if (!userId || !updateProvider || !newApiKey) {
      toast.error("Complete the new API key");
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/update-provider-key`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          provider: updateProvider,
          apiKey: newApiKey,
        }),
      });

      const data = await res.json();
      if (data.updated) {
        toast.success(`API Key for ${updateProvider} updated`);
        setShowUpdateModal(false);
        fetchHistory();

        // 🟢 ADDED: If user updates the *active* key, force re-validation
        if (activeConfig && activeConfig.provider === updateProvider) {
          clearActiveConfig();
          toast.success("Active config cleared. Please re-validate.");
        }
      } else {
        toast.error(data.error ?? "Failed to update API key");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred during the update");
    } finally {
      setUpdating(false);
    }
  };

  // --- Delete Provider ---
  const handleDelete = async (prov: string) => {
    if (!userId) {
      toast.error("Not logged in yet, please log in first");
      return;
    }
    if (!confirm(`Delete API Key for provider "${prov}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/delete-provider-key`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, provider: prov }),
      });

      const data = await res.json();
      if (data.deleted) {
        toast.success(`Provider ${prov} successfully deleted`);
        setHistory((prev) => prev.filter((h) => h.provider !== prov));

        // 🟢 ADDED: If user deletes the *active* key, clear config
        if (activeConfig && activeConfig.provider === prov) {
          clearActiveConfig();
          toast.success("Active config cleared.");
        }
      } else {
        toast.error(data.error ?? "Failed to delete");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete provider");
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        Checking login...
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center text-white">
        <p className="mb-4">You are not logged in</p>
        <a
          href="/login"
          className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg"
        >
          Login Now
        </a>
      </div>
    );
  }

  const handleGotIt = async () => {
    if (user) {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { hasSeenConfigHint: true });
    }
    setShowHint(false);
  };

  return (
    <div className="relative min-h-screen flex bg-[#1a1b1e] text-white">
      {showHint && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[#111216] border border-indigo-500 text-white p-8 rounded-2xl shadow-[0_0_40px_rgba(79,70,229,0.3)] max-w-xl text-center">
            <h2 className="text-2xl font-bold mb-4">
              ✨ Step 2: Configure AI Provider
            </h2>
            <p className="text-gray-300 mb-6 text-lg leading-relaxed">
              Pilih provider seperti <b>Gemini</b> atau <b>OpenAI</b>, lalu isi
              API Key kamu di sini untuk mulai menggunakan ConvoInsight.
            </p>
            <button
              onClick={handleGotIt}
              className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold text-lg"
            >
              Got it
            </button>
          </div>
        </div>
      )}
      <Toaster position="top-right" />
      <main className="flex-1 overflow-y-auto px-6 md:px-12 py-8 mr-20 lg:mr-24">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-semibold">Configuration User</h2>
          <button
            onClick={() => navigate("/home")}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition"
          >
            Back to Home
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Left: Configuration Form */}
          <div className="space-y-6">
            {/* Provider */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Provider
              </label>
              <select
                value={provider}
                disabled={isConfigSaved}
                onChange={(e) => {
                  setProvider(e.target.value as ProviderKey);
                  setApiKey("");
                  setValidated(false);
                  setModels([]);
                  setSelectedModel("");
                  setTempToken(null);
                  setIsConfigSaved(false);
                }}
                className="w-full p-2 rounded bg-gray-800 border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-- Choose --</option>
                {providerList.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>

            {/* API Key Input */}
            {!isConfigSaved && (
              <>
                {/* API Key Input */}
                {provider && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">
                      Input API Key
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="password"
                        placeholder="API Key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="flex-1 p-2 rounded bg-gray-800 border border-gray-700"
                      />
                      <button
                        disabled={loading}
                        onClick={handleValidate}
                        className={`px-4 py-2 rounded ${
                          loading
                            ? "bg-gray-700 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {loading ? "Validating..." : "Validate"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Model List */}
                {validated && models.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">
                      Select Model
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                    >
                      <option value="">-- Select Model --</option>
                      {models.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Advanced Config */}
                {selectedModel && (
                  <div className="mt-4 space-y-4">
                    {/* Verbosity */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Verbosity (Tingkat Panjang Jawaban)
                      </label>
                      <select
                        value={verbosity}
                        onChange={(e) => setVerbosity(e.target.value)}
                        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    {/* Reasoning */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Reasoning Effort (Upaya Penalaran)
                      </label>
                      <select
                        value={reasoning}
                        onChange={(e) => setReasoning(e.target.value)}
                        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                      >
                        <option value="minimum">Minimum</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    {/* Seed */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Seed (Kontrol Randomisasi)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={9999}
                        placeholder="Misal 42"
                        value={seed}
                        onChange={(e) => setSeed(Number(e.target.value))}
                        className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Usually the value is between 0 and 9999
                      </p>
                    </div>

                    {/* Save */}
                    <button
                      onClick={handleSave}
                      className="w-full py-2 mt-4 bg-green-600 rounded hover:bg-green-700"
                    >
                      Save Configuration
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: API Key History */}
          <div>
            <h3 className="text-base font-semibold mb-4">API Key History</h3>
            {loadingHistory ? (
              <p className="text-gray-400">Loading...</p>
            ) : history.length === 0 ? (
              <p className="text-gray-500 text-sm">
                There is no API key saved yet
              </p>
            ) : (
              <div className="space-y-2">
                {/* 🟡 MODIFIED: History mapping logic */}
                {history.map((item) => {
                  // Cek apakah item history ini adalah config yang sedang aktif
                  const isActive =
                    activeConfig && activeConfig.provider === item.provider;

                  // Tampilkan model yang dipilih jika aktif, jika tidak tampilkan 2 model pertama
                  const displayModelText = isActive
                    ? activeConfig.selectedModel // 👈 Tampilkan model yang DIPILIH
                    : item.models?.slice(0, 2).join(", ") ?? "-"; // 👈 Fallback

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between bg-gray-800 p-3 rounded border ${
                        // Beri highlight jika ini adalah config yg aktif
                        isActive ? "border-green-500" : "border-gray-700"
                      }`}
                    >
                      <div>
                        <p className="font-medium">{item.provider}</p>
                        <p className="text-xs text-gray-400">
                          {/* Tampilkan model yang benar */}
                          {displayModelText}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdate(item.provider)}
                          className="px-3 py-1 text-sm bg-yellow-600 rounded hover:bg-yellow-700"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => handleDelete(item.provider)}
                          className="px-3 py-1 text-sm bg-red-600 rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* --- Global Instruction Section (Full Width) --- */}
        {history.length > 0 && (
          <section className="mt-10 space-y-4">
            <h3 className="text-base font-semibold">Global Instruction</h3>

            {instructionLoading ? (
              <p className="text-gray-400">Loading instruction...</p>
            ) : (
              <>
                <textarea
                  ref={textareaRef}
                  placeholder="Add instructions so the AI better understands your context..."
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  className={`w-full p-3 rounded text-white resize-none overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed ${
                    globalInstruction?.is_active
                      ? "bg-gray-800 border-2 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                      : "bg-gray-800 border border-gray-700"
                  }`}
                  style={{ minHeight: "3rem" }}
                  disabled={!isEditingInstruction}
                />

                <div className="flex items-center gap-3">
                  {isEditingInstruction ? (
                    <>
                      <button
                        onClick={handleSaveInstruction}
                        className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
                      >
                        Save Instruction
                      </button>
                      {globalInstruction && (
                        <button
                          onClick={() => {
                            setIsEditingInstruction(false);
                            setInstruction(globalInstruction.text);
                          }}
                          className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                      )}
                    </>
                  ) : globalInstruction ? (
                    <>
                      <button
                        onClick={() => setIsEditingInstruction(true)}
                        className="px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-700"
                      >
                        Update Instruction
                      </button>
                      {globalInstruction.is_active ? (
                        <button
                          onClick={() => handleToggleInstructionActive(false)}
                          className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleInstructionActive(true)}
                          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                        >
                          Activate
                        </button>
                      )}
                    </>
                  ) : null}
                </div>
              </>
            )}
          </section>
        )}
      </main>
      {showUpdateModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-gray-900 p-6 rounded-lg shadow-lg w-full max-w-md border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-white">
              Update API Key ({updateProvider})
            </h3>
            <input
              type="password"
              placeholder="Enter new API Key..."
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
              className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowUpdateModal(false)}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
                disabled={updating}
              >
                Cancel
              </button>
              <button
                onClick={submitUpdate}
                disabled={updating}
                className="px-4 py-2 rounded bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60"
              >
                {updating ? "Saving..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
