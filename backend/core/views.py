from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import viewsets, permissions, status
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
)


class DepartamentoViewSet(viewsets.ModelViewSet):
    queryset = Departamento.objects.all()
    serializer_class = DepartamentoSerializer
    permission_classes = [permissions.IsAuthenticated]


class TreinamentoViewSet(viewsets.ModelViewSet):
    queryset = Treinamento.objects.select_related("departamento").prefetch_related("modulos")
    serializer_class = TreinamentoSerializer
    permission_classes = [permissions.IsAuthenticated]


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

        return Response(
            {
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
