from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import viewsets, permissions, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Departamento,
    Treinamento,
    Modulo,
    Colaborador,
    TreinamentoMatricula,
    ModuloProgresso,
    EficaciaQuestionario,
    EficaciaPergunta,
    EficaciaAlternativa,
    EficaciaTentativa,
    EficaciaResposta,
)
from .serializers import (
    DepartamentoSerializer,
    TreinamentoSerializer,
    ModuloSerializer,
    ColaboradorSerializer,
    TreinamentoMatriculaSerializer,
    ModuloProgressoSerializer,
    EmailLoginSerializer,
    IniciarTreinamentoSerializer,
    ConcluirModuloSerializer,
    UsuarioSerializer,
    UsuarioTreinamentoSerializer,
    EficaciaQuestionarioAdminSerializer,
    EficaciaPerguntaAdminSerializer,
    EficaciaAlternativaAdminSerializer,
    EficaciaQuestionarioPublicSerializer,
    EficaciaTentativaSerializer,
    ResponderEficaciaSerializer,
)


class DepartamentoViewSet(viewsets.ModelViewSet):
    queryset = Departamento.objects.all()
    serializer_class = DepartamentoSerializer
    permission_classes = [permissions.IsAuthenticated]


class TreinamentoViewSet(viewsets.ModelViewSet):
    queryset = Treinamento.objects.prefetch_related("departamentos", "modulos")
    serializer_class = TreinamentoSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=["get"])
    def eficacia(self, request, pk=None):
        treinamento = self.get_object()
        questionario = (
            EficaciaQuestionario.objects.prefetch_related("perguntas__alternativas")
            .filter(treinamento=treinamento, ativo=True)
            .first()
        )
        if not questionario:
            return Response({"disponivel": False, "motivo": "sem_questionario"})

        email = request.user.email.lower() if request.user.email else request.user.username.lower()
        colaborador = Colaborador.objects.filter(email=email).first()
        if not colaborador:
            return Response({"disponivel": False, "motivo": "colaborador_nao_encontrado"}, status=404)

        matricula = TreinamentoMatricula.objects.filter(
            colaborador=colaborador,
            treinamento=treinamento,
        ).first()
        if not matricula or matricula.percentual_conclusao < 100:
            return Response({"disponivel": False, "motivo": "treinamento_nao_concluido"}, status=403)

        ultima_tentativa = (
            EficaciaTentativa.objects.filter(questionario=questionario, colaborador=colaborador)
            .order_by("-concluido_em", "-id")
            .first()
        )
        return Response(
            {
                "disponivel": True,
                "questionario": EficaciaQuestionarioPublicSerializer(questionario).data,
                "ultima_tentativa": EficaciaTentativaSerializer(ultima_tentativa).data
                if ultima_tentativa
                else None,
            }
        )

    @action(detail=True, methods=["post"], url_path="eficacia/responder")
    def responder_eficacia(self, request, pk=None):
        treinamento = self.get_object()
        questionario = (
            EficaciaQuestionario.objects.prefetch_related("perguntas__alternativas")
            .filter(treinamento=treinamento, ativo=True)
            .first()
        )
        if not questionario:
            return Response({"detail": "Treinamento sem formulario de eficacia ativo."}, status=404)

        serializer = ResponderEficaciaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        respostas = serializer.validated_data["respostas"]

        email = request.user.email.lower() if request.user.email else request.user.username.lower()
        colaborador = Colaborador.objects.filter(email=email).first()
        if not colaborador:
            return Response({"detail": "Colaborador nao encontrado."}, status=404)

        matricula = TreinamentoMatricula.objects.filter(
            colaborador=colaborador,
            treinamento=treinamento,
        ).first()
        if not matricula or matricula.percentual_conclusao < 100:
            return Response({"detail": "Treinamento nao concluido."}, status=403)

        respostas_map = {item["pergunta_id"]: item for item in respostas}
        perguntas = list(questionario.perguntas.all())
        total = 0
        acertos = 0
        respostas_pendentes = []

        for pergunta in perguntas:
            resposta_item = respostas_map.get(pergunta.id, {}) or {}
            alternativa_id = resposta_item.get("alternativa_id")
            nota = resposta_item.get("nota")
            texto = (resposta_item.get("texto") or "").strip()

            alternativa = None
            correta = False
            respondeu = False

            if pergunta.tipo in ["multipla_escolha_correta", "multipla_escolha_sem_correta"]:
                if alternativa_id:
                    alternativa = pergunta.alternativas.filter(id=alternativa_id).first()
                    if not alternativa:
                        return Response(
                            {"detail": "Alternativa invalida para a pergunta informada."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    respondeu = True
                elif pergunta.obrigatoria:
                    return Response(
                        {"detail": "Responda todas as perguntas obrigatorias."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if pergunta.tipo == "multipla_escolha_correta":
                    if respondeu or pergunta.obrigatoria:
                        total += 1
                    correta = bool(alternativa and alternativa.correta)
                    if correta:
                        acertos += 1
            elif pergunta.tipo == "nota_1_10":
                if nota is not None:
                    if nota < 1 or nota > 10:
                        return Response(
                            {"detail": "Nota deve estar entre 1 e 10."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    respondeu = True
                elif pergunta.obrigatoria:
                    return Response(
                        {"detail": "Responda todas as perguntas obrigatorias."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            elif pergunta.tipo == "aberta":
                if texto:
                    respondeu = True
                elif pergunta.obrigatoria:
                    return Response(
                        {"detail": "Responda todas as perguntas obrigatorias."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                return Response(
                    {"detail": "Tipo de pergunta invalido."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not respondeu:
                nota = None
                texto = None

            respostas_pendentes.append(
                {
                    "pergunta": pergunta,
                    "alternativa_marcada": alternativa,
                    "nota": nota,
                    "texto_resposta": texto,
                    "correta": correta,
                }
            )

        tentativa = EficaciaTentativa.objects.create(
            colaborador=colaborador,
            questionario=questionario,
            total=total,
        )

        for resposta in respostas_pendentes:
            EficaciaResposta.objects.create(tentativa=tentativa, **resposta)

        percentual = int((acertos / total) * 100) if total else 0
        if questionario.nota_minima is None:
            aprovado = True
        else:
            aprovado = percentual >= questionario.nota_minima

        tentativa.acertos = acertos
        tentativa.percentual = percentual
        tentativa.aprovado = aprovado
        tentativa.concluido_em = timezone.now()
        tentativa.save(update_fields=["acertos", "percentual", "aprovado", "concluido_em"])

        if aprovado:
            matricula.status = "concluido"
            if not matricula.concluido_em:
                matricula.concluido_em = timezone.now()
        else:
            if matricula.status != "concluido":
                matricula.status = "aguardando_eficacia"
                matricula.concluido_em = None

        matricula.save(update_fields=["status", "concluido_em"])

        return Response(
            {
                "tentativa": EficaciaTentativaSerializer(tentativa).data,
                "aprovado": aprovado,
                "percentual": percentual,
                "matricula": TreinamentoMatriculaSerializer(matricula).data,
            }
        )


class ModuloViewSet(viewsets.ModelViewSet):
    queryset = Modulo.objects.select_related("treinamento")
    serializer_class = ModuloSerializer
    permission_classes = [permissions.IsAuthenticated]


class ColaboradorViewSet(viewsets.ModelViewSet):
    queryset = Colaborador.objects.all()
    serializer_class = ColaboradorSerializer
    permission_classes = [permissions.IsAuthenticated]


class TreinamentoMatriculaViewSet(viewsets.ModelViewSet):
    queryset = TreinamentoMatricula.objects.select_related("colaborador", "treinamento")
    serializer_class = TreinamentoMatriculaSerializer
    permission_classes = [permissions.IsAuthenticated]


class ModuloProgressoViewSet(viewsets.ModelViewSet):
    queryset = ModuloProgresso.objects.select_related("matricula", "modulo")
    serializer_class = ModuloProgressoSerializer
    permission_classes = [permissions.IsAuthenticated]


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = get_user_model().objects.all().order_by("username")
    serializer_class = UsuarioSerializer
    permission_classes = [permissions.IsAdminUser]

    @action(detail=True, methods=["post"])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        user.set_password("Mudar123")
        user.save(update_fields=["password"])
        return Response({"status": "senha resetada"})

    @action(detail=True, methods=["get"])
    def treinamentos(self, request, pk=None):
        user = self.get_object()
        email = user.email or user.username
        colaborador = Colaborador.objects.filter(email=email).first()
        if not colaborador:
            return Response([])

        matriculas = (
            TreinamentoMatricula.objects.select_related("treinamento")
            .filter(colaborador=colaborador)
            .order_by("-iniciado_em")
        )
        payload = [
            {
                "id": matricula.treinamento.id,
                "nome": matricula.treinamento.nome,
                "iniciado_em": matricula.iniciado_em,
                "concluido_em": matricula.concluido_em,
                "status": matricula.status,
            }
            for matricula in matriculas
        ]
        serializer = UsuarioTreinamentoSerializer(payload, many=True)
        return Response(serializer.data)


class EficaciaQuestionarioViewSet(viewsets.ModelViewSet):
    queryset = EficaciaQuestionario.objects.all()
    serializer_class = EficaciaQuestionarioAdminSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = EficaciaQuestionario.objects.prefetch_related("perguntas__alternativas").select_related(
            "treinamento"
        )
        treinamento_id = self.request.query_params.get("treinamento")
        if treinamento_id:
            qs = qs.filter(treinamento_id=treinamento_id)
            if self.request.query_params.get("include_inativos") != "1":
                qs = qs.filter(ativo=True)
            qs = qs.order_by("-id")
        return qs

    def _atualizar_status_matriculas(self, questionario):
        if not questionario.treinamento:
            return
        if questionario.ativo:
            aprovados = EficaciaTentativa.objects.filter(
                questionario=questionario,
                aprovado=True,
            ).values_list("colaborador_id", flat=True)
            TreinamentoMatricula.objects.filter(
                treinamento=questionario.treinamento,
                percentual_conclusao=100,
            ).exclude(colaborador_id__in=aprovados).update(status="aguardando_eficacia", concluido_em=None)
        else:
            TreinamentoMatricula.objects.filter(
                treinamento=questionario.treinamento,
                percentual_conclusao=100,
                status="aguardando_eficacia",
            ).update(status="concluido", concluido_em=timezone.now())

    def _desativar_outros(self, questionario):
        if questionario.treinamento and questionario.ativo:
            EficaciaQuestionario.objects.filter(treinamento=questionario.treinamento).exclude(
                id=questionario.id
            ).update(ativo=False)

    def _clonar_questionario(self, origem, treinamento):
        novo = EficaciaQuestionario.objects.create(
            treinamento=treinamento,
            titulo=origem.titulo,
            nota_minima=origem.nota_minima,
            ativo=True,
        )
        for pergunta in origem.perguntas.all():
            nova_pergunta = EficaciaPergunta.objects.create(
                questionario=novo,
                enunciado=pergunta.enunciado,
                ordem=pergunta.ordem,
                tipo=pergunta.tipo,
                obrigatoria=pergunta.obrigatoria,
            )
            for alt in pergunta.alternativas.all():
                EficaciaAlternativa.objects.create(
                    pergunta=nova_pergunta,
                    texto=alt.texto,
                    correta=alt.correta,
                )
        return novo

    def perform_create(self, serializer):
        questionario = serializer.save()
        self._desativar_outros(questionario)
        self._atualizar_status_matriculas(questionario)

    def perform_update(self, serializer):
        questionario = serializer.save()
        self._desativar_outros(questionario)
        self._atualizar_status_matriculas(questionario)

    @action(detail=True, methods=["post"], url_path="clonar")
    def clonar(self, request, pk=None):
        origem = self.get_object()
        if not origem.treinamento:
            return Response(
                {"detail": "Apenas questionarios vinculados a treinamento podem ser clonados."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        EficaciaQuestionario.objects.filter(treinamento=origem.treinamento, ativo=True).update(ativo=False)
        novo = self._clonar_questionario(origem, origem.treinamento)
        self._atualizar_status_matriculas(novo)
        return Response(EficaciaQuestionarioAdminSerializer(novo).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="aplicar-modelo")
    def aplicar_modelo(self, request):
        treinamento_id = request.data.get("treinamento_id")
        modelo_id = request.data.get("modelo_id")
        if not treinamento_id or not modelo_id:
            return Response({"detail": "treinamento_id e modelo_id sao obrigatorios."}, status=400)
        treinamento = Treinamento.objects.filter(id=treinamento_id).first()
        if not treinamento:
            return Response({"detail": "Treinamento nao encontrado."}, status=404)
        modelo = EficaciaQuestionario.objects.filter(id=modelo_id, treinamento__isnull=True).first()
        if not modelo:
            return Response({"detail": "Modelo nao encontrado."}, status=404)

        EficaciaQuestionario.objects.filter(treinamento=treinamento, ativo=True).update(ativo=False)
        novo = self._clonar_questionario(modelo, treinamento)
        self._atualizar_status_matriculas(novo)
        return Response(EficaciaQuestionarioAdminSerializer(novo).data, status=status.HTTP_201_CREATED)


class EficaciaPerguntaViewSet(viewsets.ModelViewSet):
    queryset = EficaciaPergunta.objects.all()
    serializer_class = EficaciaPerguntaAdminSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = EficaciaPergunta.objects.prefetch_related("alternativas").select_related("questionario")
        questionario_id = self.request.query_params.get("questionario")
        if questionario_id:
            qs = qs.filter(questionario_id=questionario_id)
        return qs

    def _bloquear_se_tem_tentativas(self, questionario):
        if questionario.treinamento_id and questionario.tentativas.exists():
            raise serializers.ValidationError(
                "Formulario ja respondido. Crie uma nova versao para alterar."
            )

    def perform_create(self, serializer):
        questionario = serializer.validated_data.get("questionario")
        self._bloquear_se_tem_tentativas(questionario)
        serializer.save()

    def perform_update(self, serializer):
        questionario = self.get_object().questionario
        self._bloquear_se_tem_tentativas(questionario)
        serializer.save()

    def perform_destroy(self, instance):
        self._bloquear_se_tem_tentativas(instance.questionario)
        instance.delete()


class EficaciaAlternativaViewSet(viewsets.ModelViewSet):
    queryset = EficaciaAlternativa.objects.all()
    serializer_class = EficaciaAlternativaAdminSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = EficaciaAlternativa.objects.select_related("pergunta")
        pergunta_id = self.request.query_params.get("pergunta")
        if pergunta_id:
            qs = qs.filter(pergunta_id=pergunta_id)
        return qs

    def _bloquear_se_tem_tentativas(self, pergunta):
        questionario = pergunta.questionario
        if questionario.treinamento_id and questionario.tentativas.exists():
            raise serializers.ValidationError(
                "Formulario ja respondido. Crie uma nova versao para alterar."
            )

    def perform_create(self, serializer):
        pergunta = serializer.validated_data.get("pergunta")
        self._bloquear_se_tem_tentativas(pergunta)
        serializer.save()

    def perform_update(self, serializer):
        pergunta = self.get_object().pergunta
        self._bloquear_se_tem_tentativas(pergunta)
        serializer.save()

    def perform_destroy(self, instance):
        self._bloquear_se_tem_tentativas(instance.pergunta)
        instance.delete()


class FormularioModeloViewSet(viewsets.ModelViewSet):
    queryset = EficaciaQuestionario.objects.all()
    serializer_class = EficaciaQuestionarioAdminSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return EficaciaQuestionario.objects.prefetch_related("perguntas__alternativas").filter(
            treinamento__isnull=True
        )

    def perform_create(self, serializer):
        serializer.save(treinamento=None)

    def perform_update(self, serializer):
        serializer.save(treinamento=None)


class EmailLoginView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = EmailLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        nome = serializer.validated_data.get("nome") or email.split("@", maxsplit=1)[0]
        colaborador, _ = Colaborador.objects.get_or_create(
            email=email,
            defaults={"nome": nome, "administrador": False},
        )
        return Response(ColaboradorSerializer(colaborador).data)


class IniciarTreinamentoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = IniciarTreinamentoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = request.user.email.lower() if request.user.email else request.user.username.lower()
        treinamento_id = serializer.validated_data["treinamento_id"]

        colaborador, _ = Colaborador.objects.get_or_create(
            email=email,
            defaults={"nome": email.split("@", maxsplit=1)[0], "administrador": False},
        )
        treinamento = Treinamento.objects.get(id=treinamento_id)
        matricula, _ = TreinamentoMatricula.objects.get_or_create(
            colaborador=colaborador,
            treinamento=treinamento,
        )
        matricula.status = "em_andamento"
        if not matricula.iniciado_em:
            matricula.iniciado_em = timezone.now()
        matricula.save(update_fields=["status", "iniciado_em"])
        return Response(TreinamentoMatriculaSerializer(matricula).data)


class ConcluirModuloView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ConcluirModuloSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = request.user.email.lower() if request.user.email else request.user.username.lower()
        modulo_id = serializer.validated_data["modulo_id"]
        concluido = serializer.validated_data["concluido"]

        colaborador, _ = Colaborador.objects.get_or_create(
            email=email,
            defaults={"nome": email.split("@", maxsplit=1)[0], "administrador": False},
        )
        modulo = Modulo.objects.select_related("treinamento").get(id=modulo_id)
        matricula, _ = TreinamentoMatricula.objects.get_or_create(
            colaborador=colaborador,
            treinamento=modulo.treinamento,
        )
        progresso, _ = ModuloProgresso.objects.get_or_create(matricula=matricula, modulo=modulo)
        progresso.concluido = concluido
        progresso.concluido_em = timezone.now() if concluido else None
        progresso.save(update_fields=["concluido", "concluido_em"])

        total = modulo.treinamento.modulos.count()
        concluidos = ModuloProgresso.objects.filter(
            matricula=matricula, modulo__treinamento=modulo.treinamento, concluido=True
        ).count()
        percentual = int((concluidos / total) * 100) if total else 0

        if percentual == 100:
            questionario = EficaciaQuestionario.objects.filter(
                treinamento=modulo.treinamento,
                ativo=True,
            ).first()
            if questionario:
                aprovado = EficaciaTentativa.objects.filter(
                    questionario=questionario,
                    colaborador=colaborador,
                    aprovado=True,
                ).exists()
                if aprovado:
                    matricula.status = "concluido"
                    matricula.concluido_em = matricula.concluido_em or timezone.now()
                else:
                    matricula.status = "aguardando_eficacia"
                    matricula.concluido_em = None
            else:
                matricula.status = "concluido"
                matricula.concluido_em = timezone.now()
        elif percentual > 0:
            matricula.status = "em_andamento"
        else:
            matricula.status = "nao_iniciado"

        matricula.percentual_conclusao = percentual
        if matricula.status == "em_andamento" and not matricula.iniciado_em:
            matricula.iniciado_em = timezone.now()
        matricula.save(
            update_fields=["status", "percentual_conclusao", "iniciado_em", "concluido_em"]
        )

        return Response(
            {
                "matricula": TreinamentoMatriculaSerializer(matricula).data,
                "progresso": ModuloProgressoSerializer(progresso).data,
            }
        )


class PublicCatalogoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        email = request.user.email.lower() if request.user.email else request.user.username.lower()
        Colaborador.objects.get_or_create(
            email=email,
            defaults={"nome": email.split("@", maxsplit=1)[0], "administrador": False},
        )
        departamentos = Departamento.objects.prefetch_related("treinamentos__modulos")
        serializer = DepartamentoSerializer(departamentos, many=True)
        return Response(serializer.data)


class MeProgressoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        email = request.user.email.lower() if request.user.email else request.user.username.lower()
        colaborador = Colaborador.objects.filter(email=email).first()
        if not colaborador:
            colaborador = Colaborador.objects.create(
                email=email, nome=email.split("@", maxsplit=1)[0], administrador=False
            )

        matriculas = TreinamentoMatricula.objects.filter(colaborador=colaborador)
        progresso = ModuloProgresso.objects.filter(matricula__in=matriculas)
        departamento = colaborador.departamento

        return Response(
            {
                "colaborador": {
                    "departamento_id": departamento.id if departamento else None,
                    "departamento_nome": departamento.nome if departamento else None,
                },
                "matriculas": [
                    {
                        "treinamento_id": m.treinamento_id,
                        "status": m.status,
                        "percentual_conclusao": m.percentual_conclusao,
                        "iniciado_em": m.iniciado_em,
                        "concluido_em": m.concluido_em,
                    }
                    for m in matriculas
                ],
                "modulos": [
                    {
                        "modulo_id": p.modulo_id,
                        "concluido": p.concluido,
                    }
                    for p in progresso
                ],
            }
        )
