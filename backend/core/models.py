from django.db import models


class Departamento(models.Model):
    nome = models.CharField(max_length=255)

    class Meta:
        db_table = "DEPARTAMENTOS"

    def __str__(self) -> str:
        return self.nome


class Treinamento(models.Model):
    codigo = models.CharField(max_length=50)
    nome = models.CharField(max_length=255)
    responsavel = models.CharField(max_length=255)
    ultima_atualizacao = models.DateField(auto_now=True)
    departamentos = models.ManyToManyField(Departamento, related_name="treinamentos", blank=True)
    formulario_tipo = models.CharField(
        max_length=20,
        choices=[
            ("integrado", "Formulario integrado"),
            ("microsoft_form", "Microsoft Form"),
        ],
        default="integrado",
    )
    formulario_link = models.URLField(blank=True, default="")

    class Meta:
        db_table = "TREINAMENTOS"

    def __str__(self) -> str:
        return self.nome

    def save(self, *args, **kwargs):
        if not self.codigo:
            ultimo_id = (
                Treinamento.objects.exclude(codigo__isnull=True)
                .exclude(codigo__exact="")
                .order_by("-id")
                .values_list("id", flat=True)
                .first()
            )
            proximo = (ultimo_id or 0) + 1
            self.codigo = f"TRN-{proximo:04d}"
        super().save(*args, **kwargs)


class Modulo(models.Model):
    treinamento = models.ForeignKey(Treinamento, on_delete=models.CASCADE, related_name="modulos")
    titulo = models.CharField(max_length=255)
    descricao = models.TextField()
    video_iframe = models.TextField(blank=True)
    video_origem = models.CharField(
        max_length=20,
        choices=[
            ("youtube", "YouTube"),
            ("canva", "Canva"),
            ("iframe", "Outro/Iframe"),
        ],
        default="youtube",
    )

    class Meta:
        db_table = "MODULOS"

    def __str__(self) -> str:
        return self.titulo


class Colaborador(models.Model):
    nome = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    administrador = models.BooleanField(default=False)
    departamento = models.ForeignKey(
        Departamento,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="colaboradores",
    )

    class Meta:
        db_table = "COLABORADORES"

    def __str__(self) -> str:
        return self.nome


class TreinamentoMatricula(models.Model):
    STATUS_CHOICES = [
        ("nao_iniciado", "Nao iniciado"),
        ("em_andamento", "Em andamento"),
        ("aguardando_eficacia", "Aguardando eficacia"),
        ("concluido", "Concluido"),
    ]

    colaborador = models.ForeignKey(Colaborador, on_delete=models.CASCADE, related_name="matriculas")
    treinamento = models.ForeignKey(Treinamento, on_delete=models.CASCADE, related_name="matriculas")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="nao_iniciado")
    percentual_conclusao = models.PositiveIntegerField(default=0)
    iniciado_em = models.DateTimeField(null=True, blank=True)
    concluido_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "TREINAMENTO_MATRICULAS"
        unique_together = ("colaborador", "treinamento")

    def __str__(self) -> str:
        return f"{self.colaborador} - {self.treinamento}"


class ModuloProgresso(models.Model):
    matricula = models.ForeignKey(TreinamentoMatricula, on_delete=models.CASCADE, related_name="progresso_modulos")
    modulo = models.ForeignKey(Modulo, on_delete=models.CASCADE, related_name="progresso")
    concluido = models.BooleanField(default=False)
    concluido_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "MODULO_PROGRESSO"
        unique_together = ("matricula", "modulo")

    def __str__(self) -> str:
        return f"{self.matricula} - {self.modulo}"


class EficaciaQuestionario(models.Model):
    treinamento = models.ForeignKey(
        Treinamento,
        on_delete=models.CASCADE,
        related_name="questionarios_eficacia",
        null=True,
        blank=True,
    )
    titulo = models.CharField(max_length=255, default="Formulario de eficacia")
    nota_minima = models.PositiveIntegerField(default=70, null=True, blank=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        db_table = "EFICACIA_QUESTIONARIOS"

    def __str__(self) -> str:
        return f"{self.treinamento} - {self.titulo}"


class EficaciaPergunta(models.Model):
    TIPO_CHOICES = [
        ("multipla_escolha_correta", "Multipla escolha com resposta certa"),
        ("multipla_escolha_sem_correta", "Multipla escolha sem resposta certa"),
        ("nota_1_10", "Nota de 1 a 10"),
        ("aberta", "Pergunta aberta"),
    ]

    questionario = models.ForeignKey(
        EficaciaQuestionario,
        on_delete=models.CASCADE,
        related_name="perguntas",
    )
    enunciado = models.TextField()
    ordem = models.PositiveIntegerField(default=0)
    tipo = models.CharField(max_length=40, choices=TIPO_CHOICES, default="multipla_escolha_correta")
    obrigatoria = models.BooleanField(default=True)

    class Meta:
        db_table = "EFICACIA_PERGUNTAS"
        ordering = ["ordem", "id"]

    def __str__(self) -> str:
        return self.enunciado


class EficaciaAlternativa(models.Model):
    pergunta = models.ForeignKey(
        EficaciaPergunta,
        on_delete=models.CASCADE,
        related_name="alternativas",
    )
    texto = models.TextField()
    correta = models.BooleanField(default=False)

    class Meta:
        db_table = "EFICACIA_ALTERNATIVAS"

    def __str__(self) -> str:
        return self.texto


class EficaciaTentativa(models.Model):
    colaborador = models.ForeignKey(
        Colaborador,
        on_delete=models.CASCADE,
        related_name="tentativas_eficacia",
    )
    questionario = models.ForeignKey(
        EficaciaQuestionario,
        on_delete=models.CASCADE,
        related_name="tentativas",
    )
    acertos = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField(default=0)
    percentual = models.PositiveIntegerField(default=0)
    aprovado = models.BooleanField(default=False)
    iniciado_em = models.DateTimeField(auto_now_add=True)
    concluido_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "EFICACIA_TENTATIVAS"

    def __str__(self) -> str:
        return f"{self.colaborador} - {self.questionario}"


class EficaciaResposta(models.Model):
    tentativa = models.ForeignKey(
        EficaciaTentativa,
        on_delete=models.CASCADE,
        related_name="respostas",
    )
    pergunta = models.ForeignKey(EficaciaPergunta, on_delete=models.CASCADE, related_name="respostas")
    alternativa_marcada = models.ForeignKey(
        EficaciaAlternativa,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="respostas",
    )
    nota = models.PositiveSmallIntegerField(null=True, blank=True)
    texto_resposta = models.TextField(null=True, blank=True)
    correta = models.BooleanField(default=False)

    class Meta:
        db_table = "EFICACIA_RESPOSTAS"

    def __str__(self) -> str:
        return f"{self.tentativa} - {self.pergunta_id}"
