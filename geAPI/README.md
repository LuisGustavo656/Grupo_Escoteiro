# ⚜️ API - Sistema de Gestão para Grupo Escoteiro

## 📖 Sobre o Projeto
Este projeto consiste em uma API RESTful (Back-end) desenvolvida para digitalizar e facilitar a administração de um Grupo Escoteiro. O sistema foi projetado com foco exclusivo na **liderança (Chefia e Diretoria)**, fornecendo ferramentas seguras para gerenciar o efetivo, organizar seções/patrulhas e controlar o fluxo de caixa.

**🤖 Visão de Futuro (Machine Learning):** A arquitetura do banco de dados já foi desenhada prevendo integrações de Inteligência Artificial para a segunda fase do projeto (Junho). Os dados coletados alimentarão microsserviços em Python (via Google Colab) para:
1. Agrupamento inteligente e justo de patrulhas (K-Means).

## 🛠️ Tecnologias Utilizadas
* **Node.js** com **Express** (Criação do servidor e rotas HTTP)
* **PostgreSQL** (Banco de Dados Relacional de alta integridade)
* **JWT (JSON Web Token)** (Autenticação)
* **Bcrypt** (Criptografia de senhas)
* **RBAC (Role-Based Access Control)** (Controle avançado de permissões por cargos e seções)

## 🏗️ Regras de Negócio e Arquitetura
1. **Acesso Restrito:** Apenas a Chefia e a Diretoria possuem acesso ao sistema (tabela `users`). Pais e responsáveis não possuem login, servindo apenas como banco de contatos.
2. **Isolamento de Contexto:** Um Chefe de Seção só tem permissão para visualizar dados e finanças da sua própria seção, garantindo privacidade e segurança.
3. **Hierarquia Completa:** A estrutura de dados respeita o Método Escoteiro: `Grupo -> Ramo (Seção) -> Patrulha/Matilha -> Jovem`.

---

## 🔗 Endpoints (Rotas da API)

### 🔐 1. Autenticação
* `POST /auth/login` - Valida credenciais da chefia e retorna o Token JWT.

### 🏢 2. Gestão de Ramos (Seções)
* `POST /branches` - Cria uma nova seção (Acesso: Admin).
* `GET /branches` - Lista todas as seções.
* `PUT /branches/:id` - Atualiza dados de uma seção.
* `DELETE /branches/:id` - Exclui uma seção.

### 🏕️ 3. Patrulhas e Matilhas
* `POST /patrols` - Cria uma nova patrulha vinculada a um ramo.
* `GET /patrols/branch/:branch_id` - Lista as patrulhas de uma seção específica.

### 🧑‍🤝‍🧑 4. Usuários (Chefia e Diretoria)
* `POST /users` - Cadastra equipe adulta com níveis de permissão (Admin, Financeiro, Chefe, Assistente).
* `GET /users` - Lista todos os administradores.
* `GET /users/:id` - Busca um usuário específico.
* `PUT /users/:id` - Atualiza dados ou cargo do usuário.
* `DELETE /users/:id` - Remove o acesso de um usuário.

### 👦 5. Membros (Jovens)
* `POST /members` - Cadastra um jovem, vinculando-o a um Ramo, a uma Patrulha e a um Responsável.
* `GET /members` - Lista todo o efetivo do grupo.
* `GET /members/branch/:branch_id` - Lista os jovens de uma seção (Ideal para chamadas).
* `PUT /members/:id` - Atualiza dados do jovem (Usado para registrar a **Passagem de Ramo** ou mudança de patrulha).

### 💰 6. Gestão Financeira
* `POST /finances` - Registra receita/despesa.
* `GET /finances` - Extrato geral do Grupo Escoteiro (Acesso: Admin/Financeiro).
* `GET /finances/branch/:branch_id` - Extrato isolado de uma seção (Acesso restrito ao chefe da respectiva seção ou diretoria).
* `DELETE /finances/:id` - Estorna/Exclui um registro financeiro.

### 🎯 7. Atividades (Base para Machine Learning)
*Módulo de infraestrutura de dados criado para registrar o cardápio de jogos e o histórico de aplicações, que servirá de base de treinamento para os futuros algoritmos de recomendação.*

---

## 🚀 Como rodar o projeto localmente
1. Clone este repositório.
2. Instale as dependências: `npm install`
3. Configure as variáveis de ambiente no arquivo `.env` (Credenciais do PostgreSQL e JWT_SECRET).
4. Inicie o servidor: `npm start`