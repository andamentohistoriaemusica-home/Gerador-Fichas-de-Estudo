export async function parseResponseJson<T = any>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    let data: any;
    try {
      data = await response.json();
    } catch (e) {
      throw new Error(`Resposta do servidor malformada (Status ${response.status}). Tente novamente.`);
    }

    if (!response.ok) {
      throw new Error(data?.error || `Erro no servidor (Status ${response.status}).`);
    }

    return data as T;
  }

  // Non-JSON response (e.g. HTML fallback or error page from server/proxy)
  if (!response.ok) {
    if (response.status === 503) {
      throw new Error("⚠️ Servidor temporariamente indisponível ou em alta demanda (503). Por favor, aguarde alguns segundos e tente novamente!");
    }
    if (response.status === 429) {
      throw new Error("⚠️ Limite de cota ou requisições excedido (429). Por favor, aguarde breves instantes e tente novamente!");
    }
    if (response.status === 502 || response.status === 504) {
      throw new Error(`⚠️ Servidor de IA temporariamente indisponível (${response.status}). Tente novamente em alguns segundos.`);
    }
    throw new Error(`Erro no servidor (Status ${response.status}). Por favor, tente novamente.`);
  }

  // If response is 200 OK but not JSON (e.g. fallback index.html)
  throw new Error(`O servidor retornou um formato inesperado (${response.status}). Tente novamente.`);
}
