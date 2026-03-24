from django.contrib.auth import get_user_model
from rest_framework import serializers
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


class ModuloSerializer(serializers.ModelSerializer):
    class Meta:
        model = Modulo
        fields = ["id", "titulo", "descricao", "video_iframe", "video_origem", "treinamento"]


class TreinamentoSerializer(serializers.ModelSerializer):
    modulos = ModuloSerializer(many=True, read_only=True)
    departamentos = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Departamento.objects.all(),
        allow_empty=False,
    )
    eficacia_ativa = serializers.SerializerMethodField()

    class Meta:
        model = Treinamento
        fields = [
            "id",
            "codigo",
            "nome",
            "responsavel",
            "ultima_atualizacao",
            "departamentos",
            "modulos",
            "eficacia_ativa",
        ]
        extra_kwargs = {
            "codigo": {"required": False, "allow_blank": True},
        }

    def validate(self, attrs):
        departamentos = attrs.get("departamentos")
        if departamentos is not None:
            if len(departamentos) == 0:
                raise serializers.ValidationError({"departamentos": "Selecione ao menos um departamento."})
            nomes = {dep.nome.strip().lower() for dep in departamentos if dep.nome}
            if "geral" in nomes and len(departamentos) > 1:
                raise serializers.ValidationError(
                    {"departamentos": "Quando o departamento Geral esta selecionado, nenhum outro pode ser escolhido."}
                )
        return attrs

    def get_eficacia_ativa(self, obj):
        if not getattr(obj, "pk", None):
            return False
        return obj.questionarios_eficacia.filter(ativo=True).exists()


class DepartamentoSerializer(serializers.ModelSerializer):
    treinamentos = TreinamentoSerializer(many=True, read_only=True)

    class Meta:
        model = Departamento
        fields = ["id", "nome", "treinamentos"]


class ColaboradorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Colaborador
        fields = ["id", "nome", "email", "administrador", "departamento"]


class EficaciaAlternativaAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = EficaciaAlternativa
        fields = ["id", "pergunta", "texto", "correta"]

    def validate(self, attrs):
        correta = attrs.get("correta", self.instance.correta if self.instance else False)
        pergunta = attrs.get("pergunta") or (self.instance.pergunta if self.instance else None)
        if pergunta:
            if pergunta.tipo not in ["multipla_escolha_correta", "multipla_escolha_sem_correta"]:
                raise serializers.ValidationError("Esta pergunta nao permite alternativas.")
            if pergunta.tipo != "multipla_escolha_correta" and correta:
                raise serializers.ValidationError("Esta pergunta nao permite alternativa correta.")
            if correta:
                existe = EficaciaAlternativa.objects.filter(pergunta=pergunta, correta=True)
                if self.instance:
                    existe = existe.exclude(id=self.instance.id)
                if existe.exists():
                    raise serializers.ValidationError("Ja existe uma alternativa correta para esta pergunta.")
        return attrs


class EficaciaPerguntaAdminSerializer(serializers.ModelSerializer):
    alternativas = EficaciaAlternativaAdminSerializer(many=True, read_only=True)

    class Meta:
        model = EficaciaPergunta
        fields = ["id", "questionario", "enunciado", "ordem", "tipo", "obrigatoria", "alternativas"]


class EficaciaQuestionarioAdminSerializer(serializers.ModelSerializer):
    perguntas = EficaciaPerguntaAdminSerializer(many=True, read_only=True)
    tentativas_count = serializers.SerializerMethodField()

    class Meta:
        model = EficaciaQuestionario
        fields = [
            "id",
            "treinamento",
            "titulo",
            "nota_minima",
            "ativo",
            "perguntas",
            "tentativas_count",
        ]

    def get_tentativas_count(self, obj):
        return obj.tentativas.count()


class EficaciaAlternativaPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = EficaciaAlternativa
        fields = ["id", "texto"]


class EficaciaPerguntaPublicSerializer(serializers.ModelSerializer):
    alternativas = EficaciaAlternativaPublicSerializer(many=True, read_only=True)

    class Meta:
        model = EficaciaPergunta
        fields = ["id", "enunciado", "ordem", "tipo", "obrigatoria", "alternativas"]


class EficaciaQuestionarioPublicSerializer(serializers.ModelSerializer):
    perguntas = EficaciaPerguntaPublicSerializer(many=True, read_only=True)

    class Meta:
        model = EficaciaQuestionario
        fields = ["id", "titulo", "nota_minima", "perguntas"]


class EficaciaTentativaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EficaciaTentativa
        fields = [
            "id",
            "questionario",
            "percentual",
            "acertos",
            "total",
            "aprovado",
            "iniciado_em",
            "concluido_em",
        ]


class EficaciaRespostaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EficaciaResposta
        fields = [
            "id",
            "tentativa",
            "pergunta",
            "alternativa_marcada",
            "nota",
            "texto_resposta",
            "correta",
        ]


class RespostaEficaciaItemSerializer(serializers.Serializer):
    pergunta_id = serializers.IntegerField()
    alternativa_id = serializers.IntegerField(required=False, allow_null=True)
    nota = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=10)
    texto = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class ResponderEficaciaSerializer(serializers.Serializer):
    respostas = RespostaEficaciaItemSerializer(many=True)


class TreinamentoMatriculaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreinamentoMatricula
        fields = [
            "id",
            "colaborador",
            "treinamento",
            "status",
            "percentual_conclusao",
            "iniciado_em",
            "concluido_em",
        ]


class ModuloProgressoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModuloProgresso
        fields = ["id", "matricula", "modulo", "concluido", "concluido_em"]


class EmailLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    nome = serializers.CharField(max_length=255, required=False, allow_blank=True)


class IniciarTreinamentoSerializer(serializers.Serializer):
    treinamento_id = serializers.IntegerField()


class ConcluirModuloSerializer(serializers.Serializer):
    modulo_id = serializers.IntegerField()
    concluido = serializers.BooleanField()


class UsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    departamento_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    departamento_nome = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = get_user_model()
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_staff",
            "is_active",
            "password",
            "departamento_id",
            "departamento_nome",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        email = instance.email or instance.username
        colaborador = Colaborador.objects.filter(email=email).select_related("departamento").first()
        data["departamento_id"] = colaborador.departamento_id if colaborador else None
        return data

    def get_departamento_nome(self, instance):
        email = instance.email or instance.username
        colaborador = Colaborador.objects.filter(email=email).select_related("departamento").first()
        if not colaborador or not colaborador.departamento:
            return None
        return colaborador.departamento.nome

    def _sync_colaborador_departamento(self, user, departamento_id):
        email = user.email or user.username
        if not email:
            return
        nome = f"{user.first_name} {user.last_name}".strip() or email
        colaborador, _ = Colaborador.objects.get_or_create(
            email=email,
            defaults={
                "nome": nome,
                "administrador": user.is_staff,
            },
        )
        colaborador.nome = nome
        colaborador.administrador = user.is_staff
        if departamento_id:
            colaborador.departamento = Departamento.objects.filter(id=departamento_id).first()
        else:
            colaborador.departamento = None
        colaborador.save(update_fields=["nome", "administrador", "departamento"])

    def create(self, validated_data):
        departamento_id = validated_data.pop("departamento_id", None) if "departamento_id" in validated_data else None
        password = validated_data.pop("password", None) or "Mudar123"
        user = self.Meta.model(**validated_data)
        user.set_password(password)
        user.save()
        if "departamento_id" in self.initial_data:
            self._sync_colaborador_departamento(user, departamento_id)
        return user

    def update(self, instance, validated_data):
        departamento_id_present = "departamento_id" in validated_data
        departamento_id = validated_data.pop("departamento_id", None) if departamento_id_present else None
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        if departamento_id_present:
            self._sync_colaborador_departamento(instance, departamento_id)
        return instance


class UsuarioTreinamentoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nome = serializers.CharField()
    iniciado_em = serializers.DateTimeField(allow_null=True)
    concluido_em = serializers.DateTimeField(allow_null=True)
    status = serializers.CharField()
