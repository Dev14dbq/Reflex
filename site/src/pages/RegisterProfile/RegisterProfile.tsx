// src/pages/RegisterProfile/RegisterProfile.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiUser, 
  FiMapPin, 
  FiCalendar, 
  FiEdit3, 
  FiTarget, 
  FiArrowRight, 
  FiArrowLeft, 
  FiCheck,
  FiStar,
  FiShield,
  FiFileText,
  FiLock
} from "react-icons/fi";
import { PageTransition } from "../../components/ui/PageTransition";
import { useCitySearch } from '../../hooks/useCitySearch';
import styles from "./RegisterProfile.module.scss";

interface FormData {
  name: string;
  gender: string;
  birthYear: string;
  city: string;
  goals: string[];
  bio: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  dataProcessingAccepted: boolean;
}

interface CityOption {
  value: string;
  data: {
    city: string;
    region: string;
    country: string;
  };
}

export const RegisterProfile: React.FC<{ className?: string }> = ({ className }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    name: "",
    gender: "",
    birthYear: "2005",
    city: "",
    goals: [],
    bio: "",
    termsAccepted: false,
    privacyAccepted: false,
    dataProcessingAccepted: false,
  });
  const [citySuggestions, setCitySuggestions] = useState<CityOption[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [isValidCity, setIsValidCity] = useState(false);
  const [cityTouched, setCityTouched] = useState(false);
  const { searchCities: searchLocalCities, isLoading: cityLoading } = useCitySearch();

  // Load saved form data from localStorage on component mount
  useEffect(() => {
    const savedFormData = localStorage.getItem('registrationForm');
    const savedStep = localStorage.getItem('registrationStep');
    const savedCityValid = localStorage.getItem('registrationCityValid');
    const savedCityTouched = localStorage.getItem('registrationCityTouched');
    
    if (savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData);
        setForm(parsedData);
      } catch (error) {
        console.error('Error parsing saved form data:', error);
      }
    }
    
    if (savedStep) {
      const parsedStep = parseInt(savedStep, 10);
      if (parsedStep >= 1 && parsedStep <= 7) {
        setStep(parsedStep);
      }
    }

    if (savedCityValid === 'true') {
      setIsValidCity(true);
    }

    if (savedCityTouched === 'true') {
      setCityTouched(true);
    }
  }, []);

  // Save form data to localStorage whenever form changes
  useEffect(() => {
    localStorage.setItem('registrationForm', JSON.stringify(form));
  }, [form]);

  // Save step to localStorage whenever step changes
  useEffect(() => {
    localStorage.setItem('registrationStep', step.toString());
  }, [step]);

  // Save city validation state
  useEffect(() => {
    localStorage.setItem('registrationCityValid', isValidCity.toString());
  }, [isValidCity]);

  useEffect(() => {
    localStorage.setItem('registrationCityTouched', cityTouched.toString());
  }, [cityTouched]);

  // Популярные города для fallback
  const popularCities = [
    // Россия
    { city: "Москва", region: "Москва", country: "Россия" },
    { city: "Санкт-Петербург", region: "Санкт-Петербург", country: "Россия" },
    { city: "Новосибирск", region: "Новосибирская область", country: "Россия" },
    { city: "Екатеринбург", region: "Свердловская область", country: "Россия" },
    { city: "Казань", region: "Республика Татарстан", country: "Россия" },
    { city: "Нижний Новгород", region: "Нижегородская область", country: "Россия" },
    { city: "Челябинск", region: "Челябинская область", country: "Россия" },
    { city: "Самара", region: "Самарская область", country: "Россия" },
    { city: "Омск", region: "Омская область", country: "Россия" },
    { city: "Ростов-на-Дону", region: "Ростовская область", country: "Россия" },
    
    // СНГ
    { city: "Киев", region: "Киевская область", country: "Украина" },
    { city: "Минск", region: "Минская область", country: "Беларусь" },
    { city: "Алматы", region: "Алматинская область", country: "Казахстан" },
    { city: "Ташкент", region: "Ташкентская область", country: "Узбекистан" },
    { city: "Баку", region: "Апшеронский район", country: "Азербайджан" },
    { city: "Ереван", region: "Араратская область", country: "Армения" },
    { city: "Тбилиси", region: "Тбилиси", country: "Грузия" },
    { city: "Кишинев", region: "Кишинев", country: "Молдова" }
  ];

  const goalsOptions = [
    { id: "секс", label: "Секс", icon: "🔥", description: "Поиск партнера для интимных встреч" },
    { id: "обмен фото", label: "Обмен фото", icon: "📸", description: "Обмен личными фотографиями" },
    { id: "отношения на расстоянии", label: "Отношения на расстоянии", icon: "💕", description: "Серьезные отношения без привязки к месту" },
    { id: "отношения локально", label: "Отношения локально", icon: "❤️", description: "Поиск партнера в вашем городе" },
    { id: "общение", label: "Общение", icon: "💬", description: "Дружеское общение и знакомства" }
  ];
  
  const genders = [
    { id: "пасс", label: "Пасс", color: "from-pink-500 to-rose-500", description: "Пассивная роль" },
    { id: "уни-пасс", label: "Уни-Пасс", color: "from-purple-500 to-pink-500", description: "Универсал с предпочтением пассива" },
    { id: "уни", label: "Уни", color: "from-blue-500 to-purple-500", description: "Универсальная роль" },
    { id: "уни-акт", label: "Уни-Акт", color: "from-green-500 to-blue-500", description: "Универсал с предпочтением актива" },
    { id: "акт", label: "Акт", color: "from-orange-500 to-red-500", description: "Активная роль" }
  ];
  
  const years = Array.from({ length: 2012 - 1995 + 1 }, (_, i) => (2012 - i).toString());

  const stepIcons = [FiUser, FiStar, FiCalendar, FiMapPin, FiTarget, FiEdit3, FiShield];
  const stepTitles = [
    "Как к вам обращаться?",
    "Какая у вас роль?",
    "Год рождения",
    "Откуда вы?",
    "Что ищете?",
    "Расскажите о себе",
    "Согласие и условия"
  ];

  const handleChange = (key: keyof FormData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const next = () => {
    if (isStepValid()) {
      setStep((s) => s + 1);
    }
  };
  
  const prev = () => setStep((s) => s - 1);

  const toggleGoal = (goal: string) => {
    setForm((prev) => {
      const newGoals = prev.goals.includes(goal)
        ? prev.goals.filter((g) => g !== goal)
        : prev.goals.length < 3
        ? [...prev.goals, goal]
        : prev.goals;
      return { ...prev, goals: newGoals };
    });
  };

  // Поиск в fallback списке
  const searchFallbackCities = (query: string): CityOption[] => {
    if (query.length < 2) return [];
    
    return popularCities
      .filter(city => 
        city.city.toLowerCase().includes(query.toLowerCase()) ||
        city.region.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 6)
      .map(city => ({
        value: `${city.city}, ${city.region}`,
        data: city
      }));
  };

  // Поиск городов в локальном файле
  const searchCities = (query: string) => {
    if (query.length < 2) {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
      return;
    }

    const localResults = searchLocalCities(query);
    
    const suggestions = localResults.map(city => ({
      value: city.name,
      data: {
        city: city.name,
        region: '',
        country: ''
      }
    }));

    if (suggestions.length === 0) {
      const fallbackResults = searchFallbackCities(query);
      setCitySuggestions(fallbackResults);
      setShowCitySuggestions(fallbackResults.length > 0);
    } else {
      setCitySuggestions(suggestions);
      setShowCitySuggestions(true);
    }
  };

  const handleCityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleChange("city", value);
    setCityTouched(true);
    setIsValidCity(false);
    searchCities(value);
  };

  const selectCity = (option: CityOption) => {
    const fullCityName = option.data.region 
      ? `${option.data.city}, ${option.data.region}`
      : option.data.city;
    handleChange("city", fullCityName);
    setCitySuggestions([]);
    setShowCitySuggestions(false);
    setIsValidCity(true);
    setCityTouched(true);
  };

  const isStepValid = (): boolean => {
    switch (step) {
      case 1: return form.name.trim().length >= 2 && form.name.trim().length <= 16;
      case 2: return form.gender !== "";
      case 3: return form.birthYear !== "";
      case 4: return form.city.trim().length > 0 && isValidCity;
      case 5: return form.goals.length > 0;
      case 6: return form.bio.trim().length >= 10;
      case 7: return form.termsAccepted && form.privacyAccepted && form.dataProcessingAccepted;
      default: return false;
    }
  };

  const submit = async () => {
    if (!isStepValid()) return;

    const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
    const avatarUrl = tgUser?.photo_url 
      ? [tgUser.photo_url] 
      : [`https://api.dicebear.com/7.x/thumbs/svg?seed=${Math.floor(Math.random() * 1000000)}`];

    try {
      const res = await fetch("https://spectrmod.ru/api/profile/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          preferredName: form.name,
          gender: form.gender,
          birthYear: form.birthYear,
          city: form.city,
          goals: form.goals,
          description: form.bio,
          images: avatarUrl,
        }),
      });

      if (!res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const err = await res.json();
          console.error("[SUBMIT] Error:", err);
        } else {
          const txt = await res.text();
          console.error("[SUBMIT] Non-JSON error:", txt);
        }
        return;
      }

      const data = await res.json();
      console.log("[SUBMIT] Success:", data);
      
      // Clear saved form data after successful registration
      localStorage.removeItem('registrationForm');
      localStorage.removeItem('registrationStep');
      localStorage.removeItem('registrationCityValid');
      localStorage.removeItem('registrationCityTouched');
      
      window.location.href = "/";
    } catch (e) {
      console.error("[SUBMIT] Exception:", e);
    }
  };

  const StepIcon = stepIcons[step - 1];

  return (
    <PageTransition className={`${styles.registerPage} ${className || ""}`}>
      {/* Header with progress */}
      <div className={styles.header}>
        <div className={styles.iconContainer}>
          <StepIcon className={styles.stepIcon} />
        </div>
        <h1 className={styles.title}>Создание профиля</h1>
        
        <div className={styles.progressInfo}>
          <span>Шаг {step} из 7</span>
          <span>{Math.round((step / 7) * 100)}%</span>
        </div>
        
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ width: `${(step / 7) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className={styles.stepContent}>
        <h2 className={styles.stepTitle}>
          {stepTitles[step - 1]}
        </h2>

        {/* Step 1: Name */}
        {step === 1 && (
          <div className={styles.stepBody}>
            <div className={styles.inputCard}>
              <div className={styles.inputWithIcon}>
                <div className={styles.inputIcon}>
                  <FiUser />
                </div>
                <div className={styles.inputContent}>
                  <input
                    className={`${styles.neuInput} ${
                      form.name.trim().length > 0 && form.name.trim().length < 2 ? styles.inputError : ''
                    } ${
                      form.name.trim().length >= 2 && form.name.trim().length <= 16 ? styles.inputSuccess : ''
                    }`}
                    placeholder="Например, Алекс"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    maxLength={16}
                  />
                  <p className={styles.inputHint}>
                    От 2 до 16 символов ({form.name.length}/16)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Gender */}
        {step === 2 && (
          <div className={styles.stepBody}>
            <div className={styles.optionsGrid}>
              {genders.map((g) => (
                <button
                  key={g.id}
                  className={`${styles.optionCard} ${
                    form.gender === g.id ? styles.optionSelected : ""
                  }`}
                  onClick={() => handleChange("gender", g.id)}
                >
                  <div className={styles.optionIcon}>
                    <div className={`${styles.colorIndicator} bg-gradient-to-r ${g.color}`} />
                  </div>
                  <div className={styles.optionContent}>
                    <h3>{g.label}</h3>
                    <p>{g.description}</p>
                  </div>
                  {form.gender === g.id && (
                    <div className={styles.checkIcon}>
                      <FiCheck />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Birth Year */}
        {step === 3 && (
          <div className={styles.stepBody}>
            <div className={styles.inputCard}>
              <div className={styles.inputWithIcon}>
                <div className={styles.inputIcon}>
                  <FiCalendar />
                </div>
                <div className={styles.inputContent}>
                  <select
                    className={styles.neuInput}
                    value={form.birthYear}
                    onChange={(e) => handleChange("birthYear", e.target.value)}
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y} год ({2024 - parseInt(y)} лет)
                      </option>
                    ))}
                  </select>
                  <p className={styles.inputHint}>
                    Возраст будет рассчитан автоматически
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: City */}
        {step === 4 && (
          <div className={styles.stepBody}>
            <div className={styles.inputCard}>
              <div className={styles.inputWithIcon}>
                <div className={styles.inputIcon}>
                  <FiMapPin />
                </div>
                <div className={styles.inputContent}>
                  <div className={styles.cityInputWrapper}>
                    <input
                      className={`${styles.neuInput} ${
                        cityTouched && !isValidCity ? styles.inputError : ''
                      } ${
                        cityTouched && isValidCity ? styles.inputSuccess : ''
                      }`}
                      placeholder="Начните вводить название города..."
                      value={form.city}
                      onChange={handleCityInputChange}
                      onFocus={() => form.city.length >= 2 && setShowCitySuggestions(true)}
                    />
                    
                    <div className={styles.inputStatusIcon}>
                      {cityLoading && (
                        <div className={styles.loadingSpinner}></div>
                      )}
                      {!cityLoading && cityTouched && form.city.length >= 2 && (
                        isValidCity ? (
                          <FiCheck className={styles.successIcon} />
                        ) : (
                          <span className={styles.errorIcon}>×</span>
                        )
                      )}
                    </div>

                    {/* City suggestions dropdown */}
                    {showCitySuggestions && citySuggestions.length > 0 && (
                      <div className={styles.suggestionsDropdown}>
                        {citySuggestions.map((option, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => selectCity(option)}
                            className={styles.suggestionItem}
                          >
                            <div className={styles.suggestionCity}>
                              {option.data.city}
                            </div>
                            {option.data.region && (
                              <div className={styles.suggestionRegion}>
                                {option.data.region}, {option.data.country}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Validation messages */}
                  {cityTouched && !isValidCity && form.city.length >= 2 && (
                    <div className={styles.validationError}>
                      <span>⚠️</span>
                      <span>Выберите город из списка предложений</span>
                    </div>
                  )}
                  
                  {cityTouched && isValidCity && form.city.length >= 2 && (
                    <div className={styles.validationSuccess}>
                      <span>✅</span>
                      <span>Город выбран корректно</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Goals */}
        {step === 5 && (
          <div className={styles.stepBody}>
            <div className={styles.optionsGrid}>
              {goalsOptions.map((goal) => (
                <button
                  key={goal.id}
                  className={`${styles.optionCard} ${
                    form.goals.includes(goal.id) ? styles.optionSelected : ""
                  }`}
                  onClick={() => toggleGoal(goal.id)}
                  disabled={!form.goals.includes(goal.id) && form.goals.length >= 3}
                >
                  <div className={styles.optionIcon}>
                    <span className={styles.emoji}>{goal.icon}</span>
                  </div>
                  <div className={styles.optionContent}>
                    <h3>{goal.label}</h3>
                    <p>{goal.description}</p>
                  </div>
                  {form.goals.includes(goal.id) && (
                    <div className={styles.checkIcon}>
                      <FiCheck />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className={styles.selectionHint}>
              Выберите до 3 вариантов ({form.goals.length}/3)
            </p>
          </div>
        )}

        {/* Step 6: Bio */}
        {step === 6 && (
          <div className={styles.stepBody}>
            <div className={styles.inputCard}>
              <div className={styles.inputWithIcon}>
                <div className={styles.inputIcon}>
                  <FiEdit3 />
                </div>
                <div className={styles.inputContent}>
                  <textarea
                    className={`${styles.neuInput} ${styles.textArea}`}
                    placeholder="Расскажите немного о себе, своих интересах и хобби..."
                    value={form.bio}
                    onChange={(e) => handleChange("bio", e.target.value)}
                  />
                  <p className={styles.inputHint}>
                    Минимум 10 символов ({form.bio.length}/10)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Agreements */}
        {step === 7 && (
          <div className={styles.stepBody}>
            <div className={styles.agreementsSection}>
              <div className={styles.agreementCard}>
                <div className={styles.agreementHeader}>
                  <FiFileText className={styles.agreementIcon} />
                  <h3>Пользовательское соглашение</h3>
                </div>
                <p className={styles.agreementDescription}>
                  Ознакомьтесь с правилами использования платформы
                </p>
                <div className={styles.agreementActions}>
                  <button 
                    className={styles.readButton}
                    onClick={() => navigate('/terms-of-service')}
                  >
                    Читать условия
                  </button>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.termsAccepted}
                      onChange={(e) => handleChange("termsAccepted", e.target.checked)}
                      className={styles.checkbox}
                    />
                    <span className={styles.checkmark}></span>
                    <span>Согласен с условиями</span>
                  </label>
                </div>
              </div>

              <div className={styles.agreementCard}>
                <div className={styles.agreementHeader}>
                  <FiShield className={styles.agreementIcon} />
                  <h3>Политика конфиденциальности</h3>
                </div>
                <p className={styles.agreementDescription}>
                  Как мы обрабатываем и защищаем ваши данные
                </p>
                <div className={styles.agreementActions}>
                  <button 
                    className={styles.readButton}
                    onClick={() => navigate('/privacy-policy')}
                  >
                    Читать политику
                  </button>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.privacyAccepted}
                      onChange={(e) => handleChange("privacyAccepted", e.target.checked)}
                      className={styles.checkbox}
                    />
                    <span className={styles.checkmark}></span>
                    <span>Согласен с политикой</span>
                  </label>
                </div>
              </div>

              <div className={styles.agreementCard}>
                <div className={styles.agreementHeader}>
                  <FiLock className={styles.agreementIcon} />
                  <h3>Обработка персональных данных</h3>
                </div>
                <p className={styles.agreementDescription}>
                  Согласие на обработку данных согласно ФЗ-152 и отказ от ответственности
                </p>
                <div className={styles.agreementActions}>
                  <button 
                    className={styles.readButton}
                    onClick={() => navigate('/data-processing')}
                  >
                    Читать соглашение
                  </button>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.dataProcessingAccepted}
                      onChange={(e) => handleChange("dataProcessingAccepted", e.target.checked)}
                      className={styles.checkbox}
                    />
                    <span className={styles.checkmark}></span>
                    <span>Даю согласие</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className={styles.navigation}>
        {step < 7 ? (
          <button
            onClick={next}
            disabled={!isStepValid()}
            className={`${styles.nextButton} ${
              isStepValid() ? styles.buttonEnabled : styles.buttonDisabled
            }`}
          >
            <span>Далее</span>
            <FiArrowRight />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!isStepValid()}
            className={`${styles.submitButton} ${
              isStepValid() ? styles.buttonEnabled : styles.buttonDisabled
            }`}
          >
            <FiCheck />
            <span>Создать профиль</span>
          </button>
        )}
        
        {step > 1 && (
          <button
            onClick={prev}
            className={styles.backButton}
          >
            <FiArrowLeft />
            <span>Назад</span>
          </button>
        )}
      </div>
    </PageTransition>
  );
};
