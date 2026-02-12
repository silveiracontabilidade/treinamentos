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
    departamento = models.ForeignKey(Departamento, on_delete=models.CASCADE, related_name="treinamentos")

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

    class Meta:
        db_table = "COLABORADORES"

    def __str__(self) -> str:
        return self.nome


class TreinamentoMatricula(models.Model):
    STATUS_CHOICES = [
        ("nao_iniciado", "Nao iniciado"),
        ("em_andamento", "Em andamento"),
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
