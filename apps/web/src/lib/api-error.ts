import { useCallback } from "react";

import { ApiError } from "@/lib/api";
import { type Locale, useI18n } from "@/lib/i18n";

type ApiErrorCode =
  | "invalidCredentials"
  | "registrationDisabled"
  | "emailNotVerified"
  | "invalidToken"
  | "tokenExpired"
  | "resourceExists"
  | "passwordTooShort"
  | "usernameTooShort"
  | "usernameTooLong"
  | "usernameInvalidChars"
  | "invalidRequestBody"
  | "missingRefreshCookie"
  | "missingBearerToken"
  | "invalidAccessToken"
  | "missingAuthenticatedUser"
  | "adminAccessRequired"
  | "userNotFound"
  | "domainNotFound"
  | "endpointNotFound"
  | "domainAlreadyExists"
  | "hostnameRequired"
  | "targetIpInvalid"
  | "portOutOfRange"
  | "nameRequired"
  | "invalidEndpointConfig"
  | "telegramNotConfigured"
  | "frontendAssetsUnavailable"
  | "noSelectedUser"
  | "badRequest"
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "serverError";

const messageToCode: Record<string, ApiErrorCode> = {
  "invalid credentials": "invalidCredentials",
  "registration disabled": "registrationDisabled",
  "email not verified": "emailNotVerified",
  "invalid token": "invalidToken",
  "token expired": "tokenExpired",
  "resource already exists": "resourceExists",
  "password must be at least 8 characters": "passwordTooShort",
  "username must be at least 3 characters": "usernameTooShort",
  "username must be at most 32 characters": "usernameTooLong",
  "username may only contain letters, numbers, dot, underscore, and dash": "usernameInvalidChars",
  "invalid request body": "invalidRequestBody",
  "missing refresh cookie": "missingRefreshCookie",
  "missing bearer token": "missingBearerToken",
  "invalid access token": "invalidAccessToken",
  "missing authenticated user": "missingAuthenticatedUser",
  "admin access required": "adminAccessRequired",
  "user not found": "userNotFound",
  "domain not found": "domainNotFound",
  "endpoint not found": "endpointNotFound",
  "domain already exists": "domainAlreadyExists",
  "hostname is required": "hostnameRequired",
  "target ip must be a valid ipv4 or ipv6 address": "targetIpInvalid",
  "port must be between 1 and 65535": "portOutOfRange",
  "name is required": "nameRequired",
  "invalid endpoint config": "invalidEndpointConfig",
  "telegram bot token is not configured": "telegramNotConfigured",
  "frontend assets are not available": "frontendAssetsUnavailable",
  "no selected user": "noSelectedUser",
};

const localizedMessages: Record<Locale, Record<ApiErrorCode, string>> = {
  "zh-CN": {
    invalidCredentials: "用户名或密码错误。",
    registrationDisabled: "当前已关闭注册。",
    emailNotVerified: "邮箱尚未验证。",
    invalidToken: "令牌无效。",
    tokenExpired: "令牌已过期。",
    resourceExists: "资源已存在。",
    passwordTooShort: "密码至少需要 8 个字符。",
    usernameTooShort: "用户名至少需要 3 个字符。",
    usernameTooLong: "用户名最多允许 32 个字符。",
    usernameInvalidChars: "用户名只能包含字母、数字、点号、下划线和短横线。",
    invalidRequestBody: "请求内容无效。",
    missingRefreshCookie: "缺少刷新会话所需的 Cookie。",
    missingBearerToken: "缺少访问令牌。",
    invalidAccessToken: "访问令牌无效。",
    missingAuthenticatedUser: "当前登录状态无效，请重新登录。",
    adminAccessRequired: "需要管理员权限。",
    userNotFound: "未找到用户。",
    domainNotFound: "未找到域名。",
    endpointNotFound: "未找到通知端点。",
    domainAlreadyExists: "该域名已存在。",
    hostnameRequired: "主机名不能为空。",
    targetIpInvalid: "指定 IP 必须是有效的 IPv4 或 IPv6 地址。",
    portOutOfRange: "端口必须在 1 到 65535 之间。",
    nameRequired: "名称不能为空。",
    invalidEndpointConfig: "通知端点配置无效。",
    telegramNotConfigured: "Telegram 机器人令牌尚未配置。",
    frontendAssetsUnavailable: "前端资源当前不可用。",
    noSelectedUser: "请先选择一个用户。",
    badRequest: "请求无效。",
    unauthorized: "当前操作未授权，请重新登录。",
    forbidden: "没有权限执行该操作。",
    notFound: "请求的资源不存在。",
    conflict: "资源冲突，请检查是否已存在。",
    serverError: "服务器处理请求时发生错误。",
  },
  "zh-TW": {
    invalidCredentials: "使用者名稱或密碼錯誤。",
    registrationDisabled: "目前已關閉註冊。",
    emailNotVerified: "電子郵件尚未驗證。",
    invalidToken: "權杖無效。",
    tokenExpired: "權杖已過期。",
    resourceExists: "資源已存在。",
    passwordTooShort: "密碼至少需要 8 個字元。",
    usernameTooShort: "使用者名稱至少需要 3 個字元。",
    usernameTooLong: "使用者名稱最多允許 32 個字元。",
    usernameInvalidChars: "使用者名稱只能包含字母、數字、點、底線與連字號。",
    invalidRequestBody: "請求內容無效。",
    missingRefreshCookie: "缺少重新整理會話所需的 Cookie。",
    missingBearerToken: "缺少存取權杖。",
    invalidAccessToken: "存取權杖無效。",
    missingAuthenticatedUser: "目前登入狀態無效，請重新登入。",
    adminAccessRequired: "需要管理員權限。",
    userNotFound: "找不到使用者。",
    domainNotFound: "找不到網域。",
    endpointNotFound: "找不到通知端點。",
    domainAlreadyExists: "此網域已存在。",
    hostnameRequired: "主機名稱不能為空。",
    targetIpInvalid: "指定 IP 必須是有效的 IPv4 或 IPv6 位址。",
    portOutOfRange: "埠號必須介於 1 到 65535 之間。",
    nameRequired: "名稱不能為空。",
    invalidEndpointConfig: "通知端點設定無效。",
    telegramNotConfigured: "尚未設定 Telegram 機器人權杖。",
    frontendAssetsUnavailable: "前端資源目前無法使用。",
    noSelectedUser: "請先選擇一位使用者。",
    badRequest: "請求無效。",
    unauthorized: "目前操作未授權，請重新登入。",
    forbidden: "沒有權限執行此操作。",
    notFound: "找不到要求的資源。",
    conflict: "資源衝突，請確認是否已存在。",
    serverError: "伺服器處理請求時發生錯誤。",
  },
  en: {
    invalidCredentials: "Incorrect username or password.",
    registrationDisabled: "Registration is currently disabled.",
    emailNotVerified: "Email verification is still pending.",
    invalidToken: "The token is invalid.",
    tokenExpired: "The token has expired.",
    resourceExists: "The resource already exists.",
    passwordTooShort: "Password must be at least 8 characters.",
    usernameTooShort: "Username must be at least 3 characters.",
    usernameTooLong: "Username must be at most 32 characters.",
    usernameInvalidChars: "Username may only contain letters, numbers, dots, underscores, and dashes.",
    invalidRequestBody: "The request body is invalid.",
    missingRefreshCookie: "The refresh cookie is missing.",
    missingBearerToken: "The access token is missing.",
    invalidAccessToken: "The access token is invalid.",
    missingAuthenticatedUser: "Your session is no longer valid. Please sign in again.",
    adminAccessRequired: "Admin access is required.",
    userNotFound: "The user could not be found.",
    domainNotFound: "The domain could not be found.",
    endpointNotFound: "The notification endpoint could not be found.",
    domainAlreadyExists: "This domain already exists.",
    hostnameRequired: "Hostname is required.",
    targetIpInvalid: "Pinned IP must be a valid IPv4 or IPv6 address.",
    portOutOfRange: "Port must be between 1 and 65535.",
    nameRequired: "Name is required.",
    invalidEndpointConfig: "The notification endpoint configuration is invalid.",
    telegramNotConfigured: "Telegram bot token is not configured.",
    frontendAssetsUnavailable: "Frontend assets are not available.",
    noSelectedUser: "Select a user first.",
    badRequest: "The request is invalid.",
    unauthorized: "You are not authorized for this action.",
    forbidden: "You do not have permission for this action.",
    notFound: "The requested resource could not be found.",
    conflict: "The request conflicts with an existing resource.",
    serverError: "The server failed to process the request.",
  },
  fr: {
    invalidCredentials: "Nom d'utilisateur ou mot de passe incorrect.",
    registrationDisabled: "L'inscription est actuellement désactivée.",
    emailNotVerified: "L'adresse e-mail n'est pas encore vérifiée.",
    invalidToken: "Le jeton est invalide.",
    tokenExpired: "Le jeton a expiré.",
    resourceExists: "La ressource existe déjà.",
    passwordTooShort: "Le mot de passe doit contenir au moins 8 caractères.",
    usernameTooShort: "Le nom d'utilisateur doit contenir au moins 3 caractères.",
    usernameTooLong: "Le nom d'utilisateur doit contenir au plus 32 caractères.",
    usernameInvalidChars: "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, points, tirets bas et tirets.",
    invalidRequestBody: "Le contenu de la requête est invalide.",
    missingRefreshCookie: "Le cookie de rafraîchissement est manquant.",
    missingBearerToken: "Le jeton d'accès est manquant.",
    invalidAccessToken: "Le jeton d'accès est invalide.",
    missingAuthenticatedUser: "Votre session n'est plus valide. Veuillez vous reconnecter.",
    adminAccessRequired: "Un accès administrateur est requis.",
    userNotFound: "Utilisateur introuvable.",
    domainNotFound: "Domaine introuvable.",
    endpointNotFound: "Point de notification introuvable.",
    domainAlreadyExists: "Ce domaine existe déjà.",
    hostnameRequired: "Le nom d'hôte est requis.",
    targetIpInvalid: "L’IP cible doit être une adresse IPv4 ou IPv6 valide.",
    portOutOfRange: "Le port doit être compris entre 1 et 65535.",
    nameRequired: "Le nom est requis.",
    invalidEndpointConfig: "La configuration du point de notification est invalide.",
    telegramNotConfigured: "Le jeton du bot Telegram n'est pas configuré.",
    frontendAssetsUnavailable: "Les ressources front-end ne sont pas disponibles.",
    noSelectedUser: "Sélectionnez d'abord un utilisateur.",
    badRequest: "La requête est invalide.",
    unauthorized: "Vous n'êtes pas autorisé à effectuer cette action.",
    forbidden: "Vous n'avez pas l'autorisation d'effectuer cette action.",
    notFound: "La ressource demandée est introuvable.",
    conflict: "La requête entre en conflit avec une ressource existante.",
    serverError: "Le serveur n'a pas pu traiter la requête.",
  },
  ru: {
    invalidCredentials: "Неверное имя пользователя или пароль.",
    registrationDisabled: "Регистрация сейчас отключена.",
    emailNotVerified: "Электронная почта ещё не подтверждена.",
    invalidToken: "Токен недействителен.",
    tokenExpired: "Срок действия токена истёк.",
    resourceExists: "Ресурс уже существует.",
    passwordTooShort: "Пароль должен содержать не менее 8 символов.",
    usernameTooShort: "Имя пользователя должно содержать не менее 3 символов.",
    usernameTooLong: "Имя пользователя должно содержать не более 32 символов.",
    usernameInvalidChars: "Имя пользователя может содержать только буквы, цифры, точки, подчёркивания и дефисы.",
    invalidRequestBody: "Содержимое запроса недействительно.",
    missingRefreshCookie: "Отсутствует cookie для обновления сессии.",
    missingBearerToken: "Отсутствует токен доступа.",
    invalidAccessToken: "Токен доступа недействителен.",
    missingAuthenticatedUser: "Сеанс больше недействителен. Войдите снова.",
    adminAccessRequired: "Требуются права администратора.",
    userNotFound: "Пользователь не найден.",
    domainNotFound: "Домен не найден.",
    endpointNotFound: "Точка уведомлений не найдена.",
    domainAlreadyExists: "Этот домен уже существует.",
    hostnameRequired: "Имя хоста обязательно.",
    targetIpInvalid: "Заданный IP должен быть корректным адресом IPv4 или IPv6.",
    portOutOfRange: "Порт должен быть в диапазоне от 1 до 65535.",
    nameRequired: "Имя обязательно.",
    invalidEndpointConfig: "Конфигурация точки уведомлений недействительна.",
    telegramNotConfigured: "Токен Telegram-бота не настроен.",
    frontendAssetsUnavailable: "Фронтенд-ресурсы недоступны.",
    noSelectedUser: "Сначала выберите пользователя.",
    badRequest: "Некорректный запрос.",
    unauthorized: "У вас нет авторизации для этого действия.",
    forbidden: "У вас нет прав для этого действия.",
    notFound: "Запрошенный ресурс не найден.",
    conflict: "Запрос конфликтует с уже существующим ресурсом.",
    serverError: "Сервер не смог обработать запрос.",
  },
  ja: {
    invalidCredentials: "ユーザー名またはパスワードが正しくありません。",
    registrationDisabled: "現在、登録は無効になっています。",
    emailNotVerified: "メールアドレスの確認がまだ完了していません。",
    invalidToken: "トークンが無効です。",
    tokenExpired: "トークンの有効期限が切れています。",
    resourceExists: "リソースはすでに存在します。",
    passwordTooShort: "パスワードは 8 文字以上である必要があります。",
    usernameTooShort: "ユーザー名は 3 文字以上である必要があります。",
    usernameTooLong: "ユーザー名は 32 文字以下である必要があります。",
    usernameInvalidChars: "ユーザー名には英字、数字、ドット、アンダースコア、ハイフンのみ使用できます。",
    invalidRequestBody: "リクエスト内容が不正です。",
    missingRefreshCookie: "セッション更新用の Cookie がありません。",
    missingBearerToken: "アクセストークンがありません。",
    invalidAccessToken: "アクセストークンが無効です。",
    missingAuthenticatedUser: "セッションが無効です。もう一度ログインしてください。",
    adminAccessRequired: "管理者権限が必要です。",
    userNotFound: "ユーザーが見つかりません。",
    domainNotFound: "ドメインが見つかりません。",
    endpointNotFound: "通知エンドポイントが見つかりません。",
    domainAlreadyExists: "このドメインはすでに存在します。",
    hostnameRequired: "ホスト名は必須です。",
    targetIpInvalid: "指定 IP は有効な IPv4 または IPv6 アドレスである必要があります。",
    portOutOfRange: "ポートは 1 から 65535 の範囲で指定してください。",
    nameRequired: "名前は必須です。",
    invalidEndpointConfig: "通知エンドポイントの設定が不正です。",
    telegramNotConfigured: "Telegram ボットトークンが設定されていません。",
    frontendAssetsUnavailable: "フロントエンドのアセットが利用できません。",
    noSelectedUser: "先にユーザーを選択してください。",
    badRequest: "リクエストが不正です。",
    unauthorized: "この操作を行う権限がありません。",
    forbidden: "この操作を実行する権限がありません。",
    notFound: "要求されたリソースが見つかりません。",
    conflict: "既存のリソースと競合しています。",
    serverError: "サーバーがリクエストを処理できませんでした。",
  },
  es: {
    invalidCredentials: "Nombre de usuario o contraseña incorrectos.",
    registrationDisabled: "El registro está deshabilitado actualmente.",
    emailNotVerified: "El correo electrónico aún no está verificado.",
    invalidToken: "El token no es válido.",
    tokenExpired: "El token ha expirado.",
    resourceExists: "El recurso ya existe.",
    passwordTooShort: "La contraseña debe tener al menos 8 caracteres.",
    usernameTooShort: "El nombre de usuario debe tener al menos 3 caracteres.",
    usernameTooLong: "El nombre de usuario debe tener como máximo 32 caracteres.",
    usernameInvalidChars: "El nombre de usuario solo puede contener letras, números, puntos, guiones bajos y guiones.",
    invalidRequestBody: "El contenido de la solicitud no es válido.",
    missingRefreshCookie: "Falta la cookie de actualización de sesión.",
    missingBearerToken: "Falta el token de acceso.",
    invalidAccessToken: "El token de acceso no es válido.",
    missingAuthenticatedUser: "La sesión ya no es válida. Inicia sesión de nuevo.",
    adminAccessRequired: "Se requiere acceso de administrador.",
    userNotFound: "No se encontró el usuario.",
    domainNotFound: "No se encontró el dominio.",
    endpointNotFound: "No se encontró el endpoint de notificación.",
    domainAlreadyExists: "Este dominio ya existe.",
    hostnameRequired: "El hostname es obligatorio.",
    targetIpInvalid: "La IP fijada debe ser una dirección IPv4 o IPv6 válida.",
    portOutOfRange: "El puerto debe estar entre 1 y 65535.",
    nameRequired: "El nombre es obligatorio.",
    invalidEndpointConfig: "La configuración del endpoint de notificación no es válida.",
    telegramNotConfigured: "El token del bot de Telegram no está configurado.",
    frontendAssetsUnavailable: "Los recursos del frontend no están disponibles.",
    noSelectedUser: "Selecciona primero un usuario.",
    badRequest: "La solicitud no es válida.",
    unauthorized: "No estás autorizado para esta acción.",
    forbidden: "No tienes permiso para realizar esta acción.",
    notFound: "No se encontró el recurso solicitado.",
    conflict: "La solicitud entra en conflicto con un recurso existente.",
    serverError: "El servidor no pudo procesar la solicitud.",
  },
};

function normalizeMessage(message: string) {
  return message.trim().toLowerCase();
}

function codeFromStatus(status: number): ApiErrorCode | null {
  if (status >= 500) return "serverError";
  if (status === 409) return "conflict";
  if (status === 404) return "notFound";
  if (status === 403) return "forbidden";
  if (status === 401) return "unauthorized";
  if (status === 400) return "badRequest";
  return null;
}

function codeFromReason(reason: unknown): ApiErrorCode | null {
  if (!(reason instanceof Error)) {
    return null;
  }

  const normalized = normalizeMessage(reason.message);
  const messageCode = messageToCode[normalized];
  if (messageCode) {
    return messageCode;
  }

  if (reason instanceof ApiError) {
    return codeFromStatus(reason.status);
  }

  return null;
}

export function getLocalizedApiErrorMessage(locale: Locale, reason: unknown, fallbackMessage: string) {
  const code = codeFromReason(reason);
  if (!code) {
    return fallbackMessage;
  }
  return localizedMessages[locale][code] ?? localizedMessages.en[code] ?? fallbackMessage;
}

export function useApiErrorMessage() {
  const { locale } = useI18n();

  return useCallback((reason: unknown, fallbackMessage: string) => {
    return getLocalizedApiErrorMessage(locale, reason, fallbackMessage);
  }, [locale]);
}
