import React from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiLock, FiShield, FiAlertTriangle, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { PageTransition } from "../../components/ui/PageTransition";
import styles from "./Legal.module.scss";

export const DataProcessing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageTransition className={styles.legalPage}>
      <div className={styles.header}>
        <button 
          className={styles.backButton}
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft />
          <span>Назад</span>
        </button>
        
        <div className={styles.headerContent}>
          <div className={styles.iconContainer}>
            <FiLock className={styles.headerIcon} />
          </div>
          <h1 className={styles.title}>Согласие на обработку персональных данных</h1>
          <p className={styles.subtitle}>
            В соответствии с Федеральным законом №152-ФЗ "О персональных данных"
          </p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.lastUpdated}>
          <FiAlertTriangle className={styles.updateIcon} />
          <span>Последнее обновление: 17 января 2025 г.</span>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Согласие субъекта персональных данных</h2>
          <div className={styles.sectionContent}>
            <p>
              Я, пользователь платформы Reflex, действуя своей волей и в своем интересе, 
              настоящим даю свое согласие платформе Reflex (далее — «Оператор») на обработку 
              моих персональных данных на условиях и для целей, определенных настоящим Согласием.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Данные Оператора</h2>
          <div className={styles.sectionContent}>
            <p>
              <strong>Оператор:</strong> Платформа Reflex<br/>
              <strong>Юридический адрес:</strong> Указывается отдельно<br/>
              <strong>Контактная информация:</strong> Через функцию обратной связи в приложении
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Категории персональных данных</h2>
          <div className={styles.sectionContent}>
            <p>Настоящее согласие распространяется на обработку следующих персональных данных:</p>
            
            <div className={styles.dataCategory}>
              <h3 className={styles.categoryTitle}>
                <FiCheckCircle className={styles.categoryIcon} />
                Основные данные профиля
              </h3>
              <ul className={styles.list}>
                <li>Имя (псевдоним) пользователя</li>
                <li>Год рождения и возраст</li>
                <li>Город проживания</li>
                <li>Пол и предпочтения</li>
                <li>Описание профиля</li>
                <li>Фотографии</li>
                <li>Цели использования сервиса</li>
              </ul>
            </div>

            <div className={styles.dataCategory}>
              <h3 className={styles.categoryTitle}>
                <FiCheckCircle className={styles.categoryIcon} />
                Технические данные
              </h3>
              <ul className={styles.list}>
                <li>IP-адрес и информация о местоположении</li>
                <li>Данные об устройстве и браузере</li>
                <li>Cookies и аналогичные технологии</li>
                <li>Логи активности в приложении</li>
                <li>Метаданные взаимодействий</li>
              </ul>
            </div>

            <div className={styles.dataCategory}>
              <h3 className={styles.categoryTitle}>
                <FiCheckCircle className={styles.categoryIcon} />
                Данные взаимодействий
              </h3>
              <ul className={styles.list}>
                <li>Сообщения и переписки</li>
                <li>Лайки, дислайки, совпадения</li>
                <li>Настройки поиска</li>
                <li>Жалобы и обращения</li>
                <li>История активности</li>
              </ul>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Цели обработки персональных данных</h2>
          <div className={styles.sectionContent}>
            <p>Персональные данные обрабатываются в следующих целях:</p>
            <ul className={styles.list}>
              <li>Предоставление сервиса знакомств и общения</li>
              <li>Создание и управление профилем пользователя</li>
              <li>Поиск и подбор подходящих профилей</li>
              <li>Обеспечение функционирования чата и обмена сообщениями</li>
              <li>Обеспечение безопасности и предотвращение мошенничества</li>
              <li>Модерация контента и соблюдение правил сообщества</li>
              <li>Улучшение качества сервиса</li>
              <li>Аналитика использования (в анонимизированном виде)</li>
              <li>Связь с пользователем по вопросам сервиса</li>
              <li>Соблюдение правовых обязательств</li>
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Способы обработки персональных данных</h2>
          <div className={styles.sectionContent}>
            <p>Оператор обрабатывает персональные данные следующими способами:</p>
            <ul className={styles.list}>
              <li>Сбор, запись, систематизация</li>
              <li>Накопление, хранение</li>
              <li>Уточнение (обновление, изменение)</li>
              <li>Извлечение, использование</li>
              <li>Передача (предоставление, доступ)</li>
              <li>Обезличивание, блокирование</li>
              <li>Удаление, уничтожение</li>
            </ul>
            <p>
              Обработка персональных данных осуществляется как с использованием средств автоматизации, 
              так и без их использования.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Условия обработки</h2>
          <div className={styles.sectionContent}>
            <div className={styles.conditionsGrid}>
              <div className={styles.conditionCard}>
                <FiShield className={styles.conditionIcon} />
                <h3>Безопасность</h3>
                <p>Применение организационных и технических мер защиты</p>
              </div>
              
              <div className={styles.conditionCard}>
                <FiLock className={styles.conditionIcon} />
                <h3>Конфиденциальность</h3>
                <p>Ограничение доступа и обеспечение конфиденциальности</p>
              </div>
              
              <div className={styles.conditionCard}>
                <FiCheckCircle className={styles.conditionIcon} />
                <h3>Законность</h3>
                <p>Соблюдение требований законодательства РФ</p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Срок действия согласия</h2>
          <div className={styles.sectionContent}>
            <p>
              Настоящее согласие действует с момента его предоставления до:
            </p>
            <ul className={styles.list}>
              <li>Отзыва согласия субъектом персональных данных</li>
              <li>Удаления аккаунта пользователя</li>
              <li>Достижения целей обработки персональных данных</li>
              <li>Истечения срока хранения данных согласно внутренним политикам</li>
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Права субъекта персональных данных</h2>
          <div className={styles.sectionContent}>
            <p>
              В соответствии с Федеральным законом №152-ФЗ, вы имеете право:
            </p>
            <ul className={styles.list}>
              <li>Получить информацию о том, какие ваши персональные данные обрабатываются</li>
              <li>Требовать уточнения персональных данных, их блокирования или уничтожения</li>
              <li>Отозвать согласие на обработку персональных данных</li>
              <li>Обратиться в уполномоченный орган по защите прав субъектов персональных данных</li>
              <li>Защищать свои права и интересы в судебном порядке</li>
            </ul>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Порядок отзыва согласия</h2>
          <div className={styles.sectionContent}>
            <p>
              Согласие на обработку персональных данных может быть отозвано путем:
            </p>
            <ul className={styles.list}>
              <li>Удаления аккаунта через настройки приложения</li>
              <li>Обращения через функцию обратной связи в приложении</li>
              <li>Направления соответствующего уведомления оператору</li>
            </ul>
            <div className={styles.warningBox}>
              <FiAlertTriangle className={styles.warningIcon} />
              <p>
                <strong>Важно:</strong> Отзыв согласия не влияет на законность обработки 
                персональных данных до момента отзыва согласия. После отзыва согласия 
                использование сервиса может стать невозможным.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Передача персональных данных</h2>
          <div className={styles.sectionContent}>
            <p>
              Настоящим я соглашаюсь с передачей моих персональных данных третьим лицам в следующих случаях:
            </p>
            <ul className={styles.list}>
              <li>Поставщикам технических услуг (при условии соблюдения конфиденциальности)</li>
              <li>По требованию уполномоченных государственных органов в рамках их компетенции</li>
              <li>В случаях, предусмотренных федеральными законами</li>
            </ul>
          </div>
        </section>

        <section className={styles.disclaimerSection}>
          <h2 className={styles.sectionTitle}>
            <FiXCircle className={styles.sectionIcon} />
            ОТКАЗ ОТ ОТВЕТСТВЕННОСТИ
          </h2>
          <div className={styles.sectionContent}>
            <div className={styles.disclaimerBox}>
              <p>
                <strong>ВАЖНО:</strong> Платформа Reflex является сервисом для знакомств и общения. 
                Администрация не несет ответственности за:
              </p>
              <ul className={styles.list}>
                <li>Действия других пользователей платформы</li>
                <li>Достоверность информации, размещаемой пользователями</li>
                <li>Результаты знакомств и взаимоотношений между пользователями</li>
                <li>Возможные риски при личных встречах пользователей</li>
                <li>Материальный или моральный ущерб от использования сервиса</li>
                <li>Временные технические сбои или недоступность сервиса</li>
              </ul>
              
              <p>
                <strong>Пользователь самостоятельно несет ответственность за:</strong>
              </p>
              <ul className={styles.list}>
                <li>Безопасность своих персональных данных при общении с другими пользователями</li>
                <li>Соблюдение мер предосторожности при личных встречах</li>
                <li>Проверку достоверности информации других пользователей</li>
                <li>Свои действия в рамках использования платформы</li>
              </ul>
              
              <div className={styles.riskWarning}>
                <FiAlertTriangle className={styles.warningIcon} />
                <p>
                  <strong>ПРЕДУПРЕЖДЕНИЕ О РИСКАХ:</strong> Общение в интернете и знакомства 
                  через онлайн-платформы могут нести определенные риски. Будьте осторожны 
                  при раскрытии личной информации и планировании встреч.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.agreementFooter}>
          <div className={styles.footerIcon}>
            <FiLock />
          </div>
          <p>
            Предоставляя согласие, вы подтверждаете, что ознакомились с условиями обработки 
            персональных данных, понимаете связанные риски и даете осознанное согласие 
            на обработку ваших данных в указанных целях.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}; 